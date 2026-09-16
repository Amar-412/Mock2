import crypto from 'node:crypto';
import mongoose from 'mongoose';
import teamModel from '../models/team.model.js';
import eventModel from '../models/event.model.js';
import userModel from '../models/user.model.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';
import activityService from '../services/activity.service.js';
import notificationService from '../services/notification.service.js';

/**
 * Generate a random uppercase alphanumeric join code (e.g., YW-8K2D).
 */
const generateJoinCode = () => {
  return `YW-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
};

/**
 * POST /api/events/:eventId/teams
 * Create a new team for a specific competition event.
 * - Authenticated student only
 * - Event must exist and registration must be open
 * - Checks that student is not already an active member of another team in this event
 * - Creator automatically becomes LEAD in members[]
 * - Associates college with creator's college
 */
export const createTeamForEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { name } = req.body;

  if (!name || name.trim().length < 3) {
    throw new AppError('Team name is required and must be at least 3 characters', 400);
  }

  // Verify event existence and registration window
  const event = await eventModel.findById(eventId);
  if (!event || !event.isActive) {
    throw new AppError('Event not found or is inactive', 404);
  }

  if (event.status !== 'REGISTRATION_OPEN') {
    throw new AppError(`Event registration is closed (current status: ${event.status})`, 400);
  }

  const now = new Date();
  if (event.registrationStartDate && now < event.registrationStartDate) {
    throw new AppError('Registration has not opened yet for this event', 400);
  }
  if (event.registrationEndDate && now > event.registrationEndDate) {
    throw new AppError('Registration deadline has passed for this event', 400);
  }

  // Prevent student from joining/creating multiple teams for the same event
  const existingTeam = await teamModel.findOne({
    eventId: event._id,
    'members.user': req.user._id,
    'members.status': 'ACTIVE',
  });

  if (existingTeam) {
    throw new AppError('You are already an active member of a team in this event', 409);
  }

  // Check unique team name per event
  const nameExists = await teamModel.findOne({
    eventId: event._id,
    name: name.trim(),
  });
  if (nameExists) {
    throw new AppError(`A team with the name '${name.trim()}' already exists for this event`, 409);
  }

  const joinCode = generateJoinCode();

  // Create team with creator as LEAD in embedded members array
  const team = await teamModel.create({
    name: name.trim(),
    eventId: event._id,
    collegeId: req.user.college || null,
    joinCode,
    createdBy: req.user._id,
    status: 'DRAFT',
    members: [
      {
        user: req.user._id,
        role: 'LEAD',
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    ],
  });

  return sendCreated(res, {
    message: 'Team created successfully. You are the team lead.',
    data: {
      team: {
        _id: team._id,
        name: team.name,
        eventId: team.eventId,
        collegeId: team.collegeId,
        joinCode: team.joinCode,
        status: team.status,
        membersCount: team.members.length,
        members: team.members,
        createdAt: team.createdAt,
      },
    },
  });
});

/**
 * GET /api/teams/:teamId
 * Retrieve team details.
 * Enforces object-level authorization: restricted to active members of the team (or Admins).
 */
export const getTeam = asyncHandler(async (req, res) => {
  // `req.team` is already loaded and validated by requireTeamMember middleware
  const team = await teamModel
    .findById(req.team._id)
    .populate('eventId', 'title slug status teamSize')
    .populate('createdBy', 'name username avatar')
    .populate({
      path: 'members.user',
      select: 'name username avatar college',
    });

  return sendSuccess(res, {
    message: 'Team details retrieved successfully',
    data: {
      team,
    },
  });
});

/**
 * GET /api/teams/:teamId/members
 * Retrieve sanitized team member roster.
 * Enforces object-level authorization: members only.
 */
export const getTeamMembers = asyncHandler(async (req, res) => {
  const team = await teamModel.findById(req.team._id).populate({
    path: 'members.user',
    select: 'name username avatar college phone',
  });

  const members = team.members.map((m) => ({
    userId: m.user?._id || m.user,
    name: m.user?.name || 'Unknown',
    username: m.user?.username || null,
    avatar: m.user?.avatar || null,
    college: m.user?.college || null,
    role: m.role,
    status: m.status,
    joinedAt: m.joinedAt,
  }));

  return sendSuccess(res, {
    message: 'Team members retrieved successfully',
    data: {
      teamId: team._id,
      teamName: team.name,
      members,
    },
  });
});

/**
 * POST /api/teams/:teamId/finalize
 * Finalize team roster.
 * - Only authorized team lead can finalize
 * - Verifies event configuration rules (min/max members)
 * - Transitions status to FINALIZED atomically
 */
export const finalizeTeam = asyncHandler(async (req, res) => {
  // req.team is loaded and validated as LEAD by requireTeamLead middleware
  const team = req.team;

  if (team.status === 'FINALIZED') {
    throw new AppError('Team is already finalized', 400);
  }
  if (team.status === 'DISBANDED') {
    throw new AppError('Cannot finalize a disbanded team', 400);
  }

  // Load event to verify required capacity
  const event = await eventModel.findById(team.eventId);
  if (!event) {
    throw new AppError('Associated event not found', 404);
  }

  const activeMembers = team.members.filter((m) => m.status === 'ACTIVE');
  const minRequired = event.teamSize?.min || 2;
  const maxAllowed = event.teamSize?.max || 5;

  if (activeMembers.length < minRequired) {
    throw new AppError(
      `Cannot finalize team: Minimum ${minRequired} active members required (currently ${activeMembers.length})`,
      400
    );
  }

  if (activeMembers.length > maxAllowed) {
    throw new AppError(
      `Cannot finalize team: Maximum ${maxAllowed} active members allowed (currently ${activeMembers.length})`,
      400
    );
  }

  // Atomic update to FINALIZED
  const updatedTeam = await teamModel.findOneAndUpdate(
    { _id: team._id, status: { $ne: 'FINALIZED' } },
    {
      $set: {
        status: 'FINALIZED',
        finalizedAt: new Date(),
      },
    },
    { new: true }
  );

  // Record domain activity event (public milestone)
  await activityService.create({
    eventId: updatedTeam.eventId,
    teamId: updatedTeam._id,
    actorId: req.user._id,
    type: 'TEAM_FINALIZED',
    metadata: {
      teamName: updatedTeam.name,
      membersCount: updatedTeam.members.length,
    },
    visibility: 'PUBLIC',
  });

  // Notify active members that the team is finalized
  const memberNotifications = updatedTeam.members
    .filter((m) => m.status === 'ACTIVE' && m.user.toString() !== req.user._id.toString())
    .map((m) => ({
      recipient: m.user,
      sender: req.user._id,
      type: 'TEAM_FINALIZED',
      title: 'Team Roster Finalized',
      message: `Your team '${updatedTeam.name}' roster has been officially finalized by the team lead.`,
      data: { teamId: updatedTeam._id },
    }));
  await notificationService.createBulkNotifications(memberNotifications);

  return sendSuccess(res, {
    message: 'Team roster successfully finalized',
    data: {
      teamId: updatedTeam._id,
      status: updatedTeam.status,
      finalizedAt: updatedTeam.finalizedAt,
      membersCount: updatedTeam.members.length,
    },
  });
});

/**
 * PATCH /api/teams/:teamId/lead
 * Reassign team lead role to another active team member.
 * - Authorized lead only
 * - Atomic: new lead becomes LEAD, former lead becomes MEMBER
 */
export const reassignLead = asyncHandler(async (req, res) => {
  const { newLeadId } = req.body;
  if (!newLeadId) {
    throw new AppError('New lead user ID is required', 400);
  }

  const team = req.team;
  if (team.status === 'DISBANDED') {
    throw new AppError('Cannot modify a disbanded team', 400);
  }

  if (newLeadId.toString() === req.user._id.toString()) {
    throw new AppError('You are already the team lead', 400);
  }

  // Verify target is an active member
  const targetMember = team.members.find(
    (m) => m.user.toString() === newLeadId.toString() && m.status === 'ACTIVE'
  );

  if (!targetMember) {
    throw new AppError('The specified user is not an active member of this team', 400);
  }

  // Atomic reassignment using arrayFilters
  const updatedTeam = await teamModel.findOneAndUpdate(
    { _id: team._id },
    {
      $set: {
        'members.$[oldLead].role': 'MEMBER',
        'members.$[newLead].role': 'LEAD',
      },
    },
    {
      arrayFilters: [
        { 'oldLead.user': req.user._id, 'oldLead.status': 'ACTIVE' },
        { 'newLead.user': new mongoose.Types.ObjectId(newLeadId), 'newLead.status': 'ACTIVE' },
      ],
      new: true,
    }
  );

  // Notify newly assigned lead
  await notificationService.createNotification({
    recipient: newLeadId,
    sender: req.user._id,
    type: 'LEAD_REASSIGNED',
    title: 'Promoted to Team Lead',
    message: `You have been reassigned as the Team Lead for '${team.name}'.`,
    data: { teamId: team._id },
  });

  return sendSuccess(res, {
    message: 'Team lead reassigned successfully',
    data: {
      teamId: updatedTeam._id,
      members: updatedTeam.members,
    },
  });
});

export default {
  createTeamForEvent,
  getTeam,
  getTeamMembers,
  finalizeTeam,
  reassignLead,
};
