import Team from '../models/team.model.js';
import TeamMembership from '../models/teamMembership.model.js';
import TeamInvitation from '../models/teamInvitation.model.js';
import Event from '../models/event.model.js';
import Submission from '../models/submission.model.js';
import Task from '../models/task.model.js';
import { assignEvaluationForSubmission } from '../services/evaluation-assignment.service.js';
import { saveUploadedFile } from '../services/file-storage.service.js';
import AuditLog from '../models/auditLog.model.js';

function jsonSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function jsonError(res, message, statusCode = 400) {
  return res.status(statusCode).json({ success: false, message });
}

export async function createTeam(req, res) {
  const { name, eventId } = req.body;
  const event = await Event.findById(eventId);
  if (!event) return jsonError(res, 'Event not found', 404);
  if (!name) return jsonError(res, 'Team name is required', 400);

  const existingMembership = await TeamMembership.findOne({ eventId, userId: req.user._id });
  if (existingMembership) return jsonError(res, 'Student already belongs to a team for this event', 409);

  const team = await Team.create({
    name,
    eventId,
    collegeId: req.user.collegeId,
    captainId: req.user._id,
    status: 'RECRUITING',
  });

  await TeamMembership.create({
    teamId: team._id,
    eventId,
    userId: req.user._id,
    role: 'CAPTAIN',
  });

  await AuditLog.create({ userId: req.user._id, action: 'TEAM_CREATED', entityType: 'Team', entityId: team._id, metadata: { eventId } });
  return jsonSuccess(res, team, 201);
}

export async function inviteToTeam(req, res) {
  const { teamId, userId } = req.body;
  const team = await Team.findById(teamId);
  if (!team) return jsonError(res, 'Team not found', 404);
  if (String(team.captainId) !== String(req.user._id)) return jsonError(res, 'Only captain can invite members', 403);

  const existingMembership = await TeamMembership.findOne({ teamId, userId });
  if (existingMembership) return jsonError(res, 'User already on this team', 409);

  const invitation = await TeamInvitation.create({
    teamId,
    eventId: team.eventId,
    invitedUserId: userId,
    invitedBy: req.user._id,
    status: 'PENDING',
  });

  return jsonSuccess(res, invitation, 201);
}

export async function acceptInvitation(req, res) {
  const { invitationId } = req.params;
  const invitation = await TeamInvitation.findById(invitationId);
  if (!invitation) return jsonError(res, 'Invitation not found', 404);
  if (String(invitation.invitedUserId) !== String(req.user._id)) return jsonError(res, 'This invitation is not for you', 403);

  const existingMembership = await TeamMembership.findOne({ eventId: invitation.eventId, userId: req.user._id });
  if (existingMembership) return jsonError(res, 'Student already belongs to a team for this event', 409);

  const team = await Team.findById(invitation.teamId);
  if (!team) return jsonError(res, 'Team not found', 404);

  const teamMembershipCount = await TeamMembership.countDocuments({ teamId: team._id });
  if (teamMembershipCount >= team.maxMembers) {
    return jsonError(res, 'Team is already full', 409);
  }

  await TeamMembership.create({ teamId: team._id, eventId: team.eventId, userId: req.user._id, role: 'MEMBER' });
  invitation.status = 'ACCEPTED';
  await invitation.save();
  return jsonSuccess(res, { accepted: true });
}

export async function registerTeam(req, res) {
  const { teamId } = req.params;
  const team = await Team.findById(teamId);
  if (!team) return jsonError(res, 'Team not found', 404);

  const memberCount = await TeamMembership.countDocuments({ teamId: team._id });
  const event = await Event.findById(team.eventId);

  if (!event || !event.teamConfig) return jsonError(res, 'Event configuration not found', 404);
  if (memberCount < event.teamConfig.minMembers) return jsonError(res, 'Team does not meet minimum member requirement', 400);
  if (memberCount > event.teamConfig.maxMembers) return jsonError(res, 'Team exceeds maximum member limit', 400);

  team.status = 'REGISTERED';
  team.registeredAt = new Date();
  await team.save();
  return jsonSuccess(res, team);
}

export async function submitTask(req, res) {
  const { eventId, taskId } = req.params;
  const event = await Event.findById(eventId);
  if (!event) return jsonError(res, 'Event not found', 404);

  const task = await Task.findById(taskId);
  if (!task) return jsonError(res, 'Task not found', 404);
  if (String(task.eventId) !== String(eventId)) return jsonError(res, 'Task does not belong to this event', 400);

  const teamMembership = await TeamMembership.findOne({ eventId, userId: req.user._id });
  if (!teamMembership) return jsonError(res, 'Student not in a team for this event', 403);

  const team = await Team.findById(teamMembership.teamId);
  if (!team || team.status !== 'REGISTERED') return jsonError(res, 'Team is not registered for this event', 400);

  const submission = await Submission.create({
    eventId,
    taskId,
    teamId: team._id,
    submittedBy: req.user._id,
    status: 'SUBMITTED',
    submittedAt: new Date(),
  });

  const assignmentResult = await assignEvaluationForSubmission({
    submissionId: submission._id,
    eventId,
    teamId: team._id,
    taskId,
    teamCollegeId: team.collegeId,
  });

  if (!assignmentResult.created) {
    submission.status = 'SUBMITTED';
    await submission.save();
  }

  return jsonSuccess(res, { submission, assignment: assignmentResult }, 201);
}

export async function uploadSubmissionEvidence(req, res) {
  const { eventId, taskId } = req.params;
  const { files = [] } = req;

  const event = await Event.findById(eventId);
  if (!event) return jsonError(res, 'Event not found', 404);

  const task = await Task.findById(taskId);
  if (!task) return jsonError(res, 'Task not found', 404);

  const teamMembership = await TeamMembership.findOne({ eventId, userId: req.user._id });
  if (!teamMembership) return jsonError(res, 'Student not in a team for this event', 403);

  const team = await Team.findById(teamMembership.teamId);
  if (!team || team.status !== 'REGISTERED') return jsonError(res, 'Team is not registered', 400);

  const submission = await Submission.findOne({ eventId, teamId: team._id, taskId, submittedBy: req.user._id, status: 'SUBMITTED' }).sort({ createdAt: -1 });
  if (!submission) return jsonError(res, 'No active submission found for this task', 404);

  const savedEvidence = [];
  for (const file of files) {
    const saved = await saveUploadedFile(file, {
      eventId,
      teamId: team._id,
      taskId,
      submissionId: submission._id,
      type: 'submission',
    });
    savedEvidence.push({
      type: file.mimetype.startsWith('image/') ? 'PHOTO' : file.mimetype.startsWith('video/') ? 'VIDEO' : 'DOCUMENT',
      path: saved.path,
      filename: saved.filename,
      mimeType: saved.mimeType,
      size: saved.size,
      uploadedAt: new Date(),
    });
  }

  submission.evidence = [...(submission.evidence || []), ...savedEvidence];
  submission.status = 'UNDER_REVIEW';
  await submission.save();

  return jsonSuccess(res, submission, 201);
}
