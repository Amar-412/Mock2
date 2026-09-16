import mongoose from 'mongoose';
import challengeModel from '../models/challenge.model.js';
import teamChallengeModel from '../models/teamChallenge.model.js';
import teamModel from '../models/team.model.js';
import eventModel from '../models/event.model.js';
import submissionModel from '../models/submission.model.js';
import activityService from '../services/activity.service.js';
import notificationService from '../services/notification.service.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

/**
 * Helper: Verify that the authenticated user is an active member or lead of the team.
 */
const verifyTeamMembership = (team, user) => {
  if (user.role === 'ADMIN') return true;
  const isMember = team.members.some(
    (m) => m.user.toString() === user._id.toString() && m.status === 'ACTIVE'
  );
  if (!isMember) {
    throw new AppError('Access denied: You are not an active member of this team', 403);
  }
  return true;
};

/**
 * Helper: Verify that the authenticated user is the active LEAD of the team.
 */
const verifyTeamLead = (team, user) => {
  if (user.role === 'ADMIN') return true;
  const isLead = team.members.some(
    (m) => m.user.toString() === user._id.toString() && m.role === 'LEAD' && m.status === 'ACTIVE'
  );
  if (!isLead) {
    throw new AppError('Access denied: Only the team lead can perform this operation', 403);
  }
  return true;
};

/**
 * GET /api/events/:eventId/challenges
 * List all challenges belonging to a specific event.
 * Supports filtering by track/category (e.g. ?track=Waste) and status.
 */
export const getEventChallenges = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { track, status } = req.query;

  // Verify event exists
  const event = await eventModel.findById(eventId);
  if (!event || !event.isActive) {
    throw new AppError('Event not found or is no longer active', 404);
  }

  const filter = { eventId };
  if (track) {
    filter.track = new RegExp(`^${track.trim()}$`, 'i');
  }
  if (status) {
    filter.status = status;
  } else {
    // By default, exclude DRAFT and ARCHIVED from public event challenge listings
    filter.status = { $in: ['PUBLISHED', 'ACTIVE'] };
  }

  const challenges = await challengeModel
    .find(filter)
    .sort({ track: 1, createdAt: 1 });

  return sendSuccess(res, {
    message: 'Event challenges retrieved successfully',
    data: {
      count: challenges.length,
      challenges,
    },
  });
});

/**
 * GET /api/challenges/:challengeId
 * Retrieve single challenge details, including submission requirements and quantitative metrics.
 */
export const getChallengeById = asyncHandler(async (req, res) => {
  const { challengeId } = req.params;

  const challenge = await challengeModel
    .findById(challengeId)
    .populate('eventId', 'title slug status startDate endDate registrationEndDate teamSize');

  if (!challenge) {
    throw new AppError('Challenge not found', 404);
  }

  return sendSuccess(res, {
    message: 'Challenge retrieved successfully',
    data: { challenge },
  });
});

/**
 * POST /api/events/:eventId/challenges
 * Create a new challenge under an event (organizer/admin endpoint).
 */
export const createChallenge = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const {
    title,
    slug,
    description,
    track,
    instructions,
    submissionRequirements,
    quantitativeFields,
    startAt,
    endAt,
    status = 'ACTIVE',
    maxTeams,
  } = req.body;

  if (!title || !track) {
    throw new AppError('Challenge title and track category are required', 400);
  }

  const event = await eventModel.findById(eventId);
  if (!event || !event.isActive) {
    throw new AppError('Event not found or inactive', 404);
  }

  const generatedSlug = (slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) +
    `-${Date.now().toString(36)}`;

  const challenge = await challengeModel.create({
    eventId,
    title,
    slug: generatedSlug,
    description,
    track,
    instructions,
    submissionRequirements: submissionRequirements || {
      minEvidenceCount: 1,
      allowedEvidenceTypes: ['IMAGE', 'VIDEO', 'PDF', 'DOCUMENT', 'TEXT'],
    },
    quantitativeFields: quantitativeFields || [],
    startAt,
    endAt,
    status,
    maxTeams,
  });

  return sendCreated(res, {
    message: 'Challenge created successfully',
    data: { challenge },
  });
});

/**
 * POST /api/teams/:teamId/challenges
 * Join a challenge for a team.
 * Enforces:
 * 1. Authenticated user is an active member or lead of the team
 * 2. Team is not disbanded
 * 3. Challenge exists and is ACTIVE/PUBLISHED
 * 4. Challenge belongs to the team's event
 * 5. Event is not closed or archived
 * 6. Duplicate participation is rejected with 409 Conflict
 */
export const joinTeamChallenge = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { challengeId } = req.body;

  if (!challengeId) {
    throw new AppError('Challenge ID is required', 400);
  }

  // 1. Verify team exists
  const team = await teamModel.findById(teamId);
  if (!team) {
    throw new AppError('Team not found', 404);
  }

  // 2. Verify authorization (active member or lead)
  verifyTeamMembership(team, req.user);

  // 3. Team status check
  if (team.status === 'DISBANDED') {
    throw new AppError('Cannot join challenges with a disbanded team', 400);
  }

  // 4. Verify challenge exists and is joinable
  const challenge = await challengeModel.findById(challengeId);
  if (!challenge) {
    throw new AppError('Challenge not found', 404);
  }

  if (challenge.status === 'DRAFT' || challenge.status === 'ARCHIVED') {
    throw new AppError('Challenge is not open for participation', 400);
  }
  if (challenge.status === 'CLOSED') {
    throw new AppError('This challenge is closed and no longer accepting participants', 400);
  }

  // 5. Cross-event validation: Challenge MUST belong to the team's event
  if (challenge.eventId.toString() !== team.eventId.toString()) {
    throw new AppError(
      'Challenge does not belong to the event associated with this team',
      400
    );
  }

  // 6. Event timing & lifecycle validation
  const event = await eventModel.findById(team.eventId);
  if (!event || !event.isActive) {
    throw new AppError('The event associated with this challenge is not active', 400);
  }
  if (event.status === 'COMPLETED' || event.status === 'ARCHIVED') {
    throw new AppError('The event has concluded. Challenge participation is closed', 400);
  }
  if (event.registrationEndDate && new Date() > new Date(event.registrationEndDate)) {
    throw new AppError('Event registration window has closed', 400);
  }

  // 7. Duplicate participation check
  const existingParticipation = await teamChallengeModel.findOne({
    teamId: team._id,
    challengeId: challenge._id,
  });

  if (existingParticipation) {
    if (existingParticipation.status === 'JOINED' || existingParticipation.status === 'ACTIVE') {
      throw new AppError('Team is already participating in this challenge', 409);
    }
    // If previously withdrawn, reactivate
    existingParticipation.status = 'JOINED';
    existingParticipation.joinedAt = new Date();
    await existingParticipation.save();

    // Record activity
    await activityService.create({
      eventId: team.eventId,
      teamId: team._id,
      actorId: req.user._id,
      type: 'CHALLENGE_JOINED',
      metadata: {
        challengeId: challenge._id,
        challengeTitle: challenge.title,
        track: challenge.track,
      },
    });

    return sendSuccess(res, {
      message: 'Re-joined challenge successfully',
      data: { participation: existingParticipation },
    });
  }

  // 8. Create new participation record
  const participation = await teamChallengeModel.create({
    teamId: team._id,
    eventId: team.eventId,
    challengeId: challenge._id,
    status: 'JOINED',
    joinedAt: new Date(),
  });

  // 9. Record domain activity (public milestone)
  await activityService.create({
    eventId: team.eventId,
    teamId: team._id,
    actorId: req.user._id,
    type: 'CHALLENGE_JOINED',
    metadata: {
      challengeId: challenge._id,
      challengeTitle: challenge.title,
      track: challenge.track,
    },
    visibility: 'PUBLIC',
  });

  // Notify team members about joining the challenge
  const memberNotifications = team.members
    .filter((m) => m.status === 'ACTIVE' && m.user.toString() !== req.user._id.toString())
    .map((m) => ({
      recipient: m.user,
      sender: req.user._id,
      type: 'CHALLENGE_JOINED',
      title: 'Joined New Challenge',
      message: `Your team joined the challenge '${challenge.title}' (${challenge.track} track).`,
      data: { teamId: team._id, challengeId: challenge._id },
    }));
  await notificationService.createBulkNotifications(memberNotifications);

  return sendCreated(res, {
    message: 'Team successfully joined the challenge',
    data: { participation },
  });
});

/**
 * GET /api/teams/:teamId/challenges
 * Retrieve all challenges that a team is currently participating in.
 */
export const getTeamChallenges = asyncHandler(async (req, res) => {
  const { teamId } = req.params;

  const team = await teamModel.findById(teamId);
  if (!team) {
    throw new AppError('Team not found', 404);
  }

  verifyTeamMembership(team, req.user);

  const participations = await teamChallengeModel
    .find({
      teamId: team._id,
      status: { $ne: 'WITHDRAWN' },
    })
    .populate('challengeId')
    .sort({ joinedAt: -1 });

  return sendSuccess(res, {
    message: 'Team challenge participations retrieved successfully',
    data: {
      count: participations.length,
      participations,
    },
  });
});

/**
 * DELETE /api/teams/:teamId/challenges/:challengeId
 * Leave / withdraw a team's participation from a challenge.
 * Enforces:
 * 1. Only team lead or admin can withdraw
 * 2. Cannot leave if non-draft submissions exist
 */
export const leaveTeamChallenge = asyncHandler(async (req, res) => {
  const { teamId, challengeId } = req.params;

  const team = await teamModel.findById(teamId);
  if (!team) {
    throw new AppError('Team not found', 404);
  }

  verifyTeamLead(team, req.user);

  const participation = await teamChallengeModel.findOne({
    teamId: team._id,
    challengeId,
  });

  if (!participation || participation.status === 'WITHDRAWN') {
    throw new AppError('Team is not actively participating in this challenge', 404);
  }

  // Prevent leaving if non-draft submissions exist
  const submittedWork = await submissionModel.findOne({
    teamId: team._id,
    challengeId,
    status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'EVALUATED'] },
  });

  if (submittedWork) {
    throw new AppError('Cannot leave challenge after submitting work', 400);
  }

  participation.status = 'WITHDRAWN';
  await participation.save();

  return sendSuccess(res, {
    message: 'Team successfully withdrew from the challenge',
    data: { participation },
  });
});

export default {
  getEventChallenges,
  getChallengeById,
  createChallenge,
  joinTeamChallenge,
  getTeamChallenges,
  leaveTeamChallenge,
};
