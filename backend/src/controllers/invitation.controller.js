import mongoose from 'mongoose';
import teamModel from '../models/team.model.js';
import teamInvitationModel from '../models/teamInvitation.model.js';
import eventModel from '../models/event.model.js';
import userModel from '../models/user.model.js';
import notificationModel from '../models/notification.model.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

/**
 * POST /api/teams/:teamId/members/invite
 * Team Lead invites a registered student to join their team.
 */
export const inviteMember = asyncHandler(async (req, res) => {
  const { inviteeId, message } = req.body;
  if (!inviteeId) {
    throw new AppError('Invitee student user ID is required', 400);
  }

  const team = req.team; // Verified as LEAD by requireTeamLead middleware

  if (team.status === 'FINALIZED') {
    throw new AppError('Cannot invite members to a finalized team', 400);
  }
  if (team.status === 'DISBANDED') {
    throw new AppError('Cannot invite members to a disbanded team', 400);
  }

  // Self-invitation check
  if (inviteeId.toString() === req.user._id.toString()) {
    throw new AppError('You cannot invite yourself to the team', 400);
  }

  // Verify target user exists and is active student
  const invitee = await userModel.findById(inviteeId);
  if (!invitee || !invitee.isActive) {
    throw new AppError('Invited user not found or inactive', 404);
  }

  // Check if target user is already a member of this team
  const alreadyInTeam = team.members.some(
    (m) => m.user.toString() === inviteeId.toString() && m.status === 'ACTIVE'
  );
  if (alreadyInTeam) {
    throw new AppError('User is already an active member of this team', 409);
  }

  // Check if target user is already an active member of another team in the same event
  const alreadyInAnotherTeam = await teamModel.findOne({
    eventId: team.eventId,
    'members.user': invitee._id,
    'members.status': 'ACTIVE',
  });
  if (alreadyInAnotherTeam) {
    throw new AppError('This user is already an active member of another team in this event', 409);
  }

  // Check event capacity rules
  const event = await eventModel.findById(team.eventId);
  const maxAllowed = event?.teamSize?.max || 5;
  const activeCount = team.members.filter((m) => m.status === 'ACTIVE').length;

  if (activeCount >= maxAllowed) {
    throw new AppError(`Team has already reached maximum capacity of ${maxAllowed} members`, 400);
  }

  // Check for duplicate pending invitation
  const existingInvite = await teamInvitationModel.findOne({
    team: team._id,
    invitee: invitee._id,
    status: 'PENDING',
    expiresAt: { $gt: new Date() },
  });

  if (existingInvite) {
    throw new AppError('An active pending invitation has already been sent to this user', 409);
  }

  // Create invitation
  const invitation = await teamInvitationModel.create({
    team: team._id,
    inviter: req.user._id,
    invitee: invitee._id,
    message: message || `You have been invited to join team '${team.name}'`,
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  // Create notification for invitee
  await notificationModel.create({
    recipient: invitee._id,
    sender: req.user._id,
    type: 'TEAM_INVITATION',
    title: 'New Team Invitation',
    message: `${req.user.name || 'A team lead'} invited you to join team '${team.name}'.`,
    data: {
      teamId: team._id,
      invitationId: invitation._id,
    },
  });

  return sendCreated(res, {
    message: 'Invitation sent successfully',
    data: {
      invitation: {
        _id: invitation._id,
        team: team._id,
        teamName: team.name,
        invitee: {
          _id: invitee._id,
          name: invitee.name,
          username: invitee.username,
        },
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
    },
  });
});

/**
 * GET /api/invitations
 * Retrieve pending invitations for the authenticated user.
 */
export const getMyInvitations = asyncHandler(async (req, res) => {
  const invitations = await teamInvitationModel
    .find({
      invitee: req.user._id,
      status: 'PENDING',
      expiresAt: { $gt: new Date() },
    })
    .populate('team', 'name eventId status members')
    .populate('inviter', 'name username avatar')
    .sort({ createdAt: -1 });

  return sendSuccess(res, {
    message: 'Invitations retrieved successfully',
    data: {
      invitations,
    },
  });
});

/**
 * POST /api/invitations/:id/accept
 * Accept a team invitation and atomically join team.members.
 */
export const acceptInvitation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const invitation = await teamInvitationModel.findById(id);
  if (!invitation) {
    throw new AppError('Invitation not found', 404);
  }

  // 1. Validate authenticated user is the invited user
  if (invitation.invitee.toString() !== req.user._id.toString()) {
    throw new AppError('You are not authorized to respond to this invitation', 403);
  }

  // 2. Validate invitation is still pending and not expired
  if (invitation.status !== 'PENDING') {
    throw new AppError(`Invitation cannot be accepted (current status: ${invitation.status})`, 400);
  }

  if (invitation.expiresAt && new Date() > invitation.expiresAt) {
    invitation.status = 'EXPIRED';
    await invitation.save();
    throw new AppError('This invitation has expired', 400);
  }

  // 3. Load team and verify status
  const team = await teamModel.findById(invitation.team);
  if (!team) {
    throw new AppError('Associated team no longer exists', 404);
  }

  if (team.status === 'FINALIZED') {
    throw new AppError('Cannot join team: Team roster has already been finalized', 400);
  }
  if (team.status === 'DISBANDED') {
    throw new AppError('Cannot join team: Team is disbanded', 400);
  }

  // 4. Verify capacity
  const event = await eventModel.findById(team.eventId);
  const maxCapacity = event?.teamSize?.max || 5;

  const currentActive = team.members.filter((m) => m.status === 'ACTIVE').length;
  if (currentActive >= maxCapacity) {
    throw new AppError(`Cannot join team: Team has reached its maximum limit of ${maxCapacity} members`, 400);
  }

  // 5. Verify user isn't already a member
  const alreadyMember = team.members.some(
    (m) => m.user.toString() === req.user._id.toString() && m.status === 'ACTIVE'
  );
  if (alreadyMember) {
    invitation.status = 'ACCEPTED';
    invitation.respondedAt = new Date();
    await invitation.save();
    return sendSuccess(res, { message: 'You are already a member of this team' });
  }

  // 5b. Verify user isn't an active member of another team in the same event
  const alreadyInAnotherTeam = await teamModel.findOne({
    _id: { $ne: team._id },
    eventId: team.eventId,
    'members.user': req.user._id,
    'members.status': 'ACTIVE',
  });
  if (alreadyInAnotherTeam) {
    throw new AppError('You are already an active member of another team in this event', 409);
  }

  // 6. Atomically add user to team.members
  const updatedTeam = await teamModel.findOneAndUpdate(
    {
      _id: team._id,
      status: { $ne: 'FINALIZED' },
      'members.user': { $ne: req.user._id },
      $expr: {
        $lt: [
          {
            $size: {
              $filter: {
                input: '$members',
                as: 'm',
                cond: { $eq: ['$$m.status', 'ACTIVE'] },
              },
            },
          },
          maxCapacity,
        ],
      },
    },
    {
      $push: {
        members: {
          user: req.user._id,
          role: 'MEMBER',
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      },
    },
    { new: true }
  );

  if (!updatedTeam) {
    throw new AppError('Failed to join team: Capacity was reached or team was finalized concurrently', 409);
  }

  // 7. Mark invitation as ACCEPTED
  invitation.status = 'ACCEPTED';
  invitation.respondedAt = new Date();
  await invitation.save();

  // 8. Notify team lead
  await notificationModel.create({
    recipient: invitation.inviter,
    sender: req.user._id,
    type: 'INVITATION_ACCEPTED',
    title: 'Invitation Accepted',
    message: `${req.user.name || 'A student'} accepted your invitation to join team '${team.name}'.`,
    data: {
      teamId: team._id,
      invitationId: invitation._id,
      memberId: req.user._id,
    },
  });

  return sendSuccess(res, {
    message: 'Invitation accepted! You have joined the team.',
    data: {
      teamId: updatedTeam._id,
      teamName: updatedTeam.name,
      membersCount: updatedTeam.members.length,
    },
  });
});

/**
 * POST /api/invitations/:id/reject
 * Reject a team invitation.
 */
export const rejectInvitation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const invitation = await teamInvitationModel.findById(id);
  if (!invitation) {
    throw new AppError('Invitation not found', 404);
  }

  if (invitation.invitee.toString() !== req.user._id.toString()) {
    throw new AppError('You are not authorized to respond to this invitation', 403);
  }

  if (invitation.status !== 'PENDING') {
    throw new AppError(`Invitation cannot be rejected (current status: ${invitation.status})`, 400);
  }

  if (invitation.expiresAt && new Date() > invitation.expiresAt) {
    invitation.status = 'EXPIRED';
    await invitation.save();
    throw new AppError('This invitation has expired', 400);
  }

  invitation.status = 'REJECTED';
  invitation.respondedAt = new Date();
  await invitation.save();

  // Notify team lead of rejection
  await notificationModel.create({
    recipient: invitation.inviter,
    sender: req.user._id,
    type: 'INVITATION_REJECTED',
    title: 'Invitation Declined',
    message: `${req.user.name || 'A student'} declined your invitation to join the team.`,
    data: {
      teamId: invitation.team,
      invitationId: invitation._id,
    },
  });

  return sendSuccess(res, {
    message: 'Invitation rejected',
  });
});

export default {
  inviteMember,
  getMyInvitations,
  acceptInvitation,
  rejectInvitation,
};
