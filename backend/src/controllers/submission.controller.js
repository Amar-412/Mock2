import mongoose from 'mongoose';
import submissionModel from '../models/submission.model.js';
import evidenceModel from '../models/evidence.model.js';
import teamModel from '../models/team.model.js';
import eventModel from '../models/event.model.js';
import challengeModel from '../models/challenge.model.js';
import teamChallengeModel from '../models/teamChallenge.model.js';
import storageService from '../services/storage.service.js';
import activityService from '../services/activity.service.js';
import { resolveEvidenceType, sanitizeFilename } from '../middleware/upload.middleware.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

/**
 * Helper: Verify that the authenticated user is an active member of the specified team
 * or has platform-level ADMIN privileges.
 */
const verifyTeamAccess = (team, user) => {
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
 * POST /api/submissions
 * Create a new submission in DRAFT status.
 * - Authenticated student must be an active member of the team
 * - Supports idempotent clientSubmissionId
 */
export const createSubmission = asyncHandler(async (req, res) => {
  const { teamId, eventId, challengeId, reflection, quantitativeData, clientSubmissionId } = req.body;

  if (!teamId || !eventId || !challengeId) {
    throw new AppError('teamId, eventId, and challengeId are required', 400);
  }

  // Idempotency: If clientSubmissionId is provided, check if it already exists
  if (clientSubmissionId) {
    const existing = await submissionModel.findOne({ clientSubmissionId: clientSubmissionId.trim() });
    if (existing) {
      const evidence = await evidenceModel.find({ submissionId: existing._id });
      return sendSuccess(res, {
        message: 'Submission retrieved (idempotent request)',
        data: { submission: existing, evidence },
      });
    }
  }

  // Load team and verify access
  const team = await teamModel.findById(teamId);
  if (!team) {
    throw new AppError('Team not found', 404);
  }
  verifyTeamAccess(team, req.user);

  if (team.status === 'DISBANDED') {
    throw new AppError('Cannot create a submission for a disbanded team', 400);
  }

  // Verify event
  const event = await eventModel.findById(eventId);
  if (!event || !event.isActive) {
    throw new AppError('Event not found or inactive', 404);
  }

  // Verify challenge and team participation if challenge exists in catalog
  const challenge = await challengeModel.findById(challengeId);
  if (challenge) {
    if (challenge.eventId.toString() !== team.eventId.toString()) {
      throw new AppError('Challenge does not belong to the event associated with this team', 400);
    }
    const participation = await teamChallengeModel.findOne({
      teamId: team._id,
      challengeId: challenge._id,
      status: { $in: ['JOINED', 'ACTIVE'] },
    });
    if (!participation) {
      throw new AppError('Team is not participating in this challenge. Please join the challenge first.', 400);
    }
  }

  // Check if team already has a non-rejected submission for this challenge
  const existingChallengeSubmission = await submissionModel.findOne({
    teamId: team._id,
    challengeId: new mongoose.Types.ObjectId(challengeId),
    status: { $ne: 'REJECTED' },
  });

  if (existingChallengeSubmission) {
    throw new AppError('An active submission already exists for this challenge', 409);
  }

  const submission = await submissionModel.create({
    clientSubmissionId: clientSubmissionId ? clientSubmissionId.trim() : null,
    teamId: team._id,
    eventId: event._id,
    challengeId: new mongoose.Types.ObjectId(challengeId),
    submittedBy: req.user._id,
    reflection: reflection ? reflection.trim() : '',
    quantitativeData: quantitativeData || {},
    status: 'DRAFT',
  });

  // Record domain activity
  await activityService.create({
    eventId: event._id,
    teamId: team._id,
    actorId: req.user._id,
    type: 'SUBMISSION_CREATED',
    metadata: {
      submissionId: submission._id,
      challengeId: submission.challengeId,
    },
  });

  return sendCreated(res, {
    message: 'Draft submission created successfully',
    data: { submission, evidence: [] },
  });
});

/**
 * GET /api/submissions/:id
 * Retrieve a submission and its attached evidence.
 * Enforces object-level authorization: team members or admins only.
 */
export const getSubmissionById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const submission = await submissionModel
    .findById(id)
    .populate('teamId', 'name members status eventId')
    .populate('submittedBy', 'name username avatar');

  if (!submission) {
    throw new AppError('Submission not found', 404);
  }

  // Enforce object-level team authorization
  verifyTeamAccess(submission.teamId, req.user);

  const evidence = await evidenceModel
    .find({ submissionId: submission._id })
    .populate('uploadedBy', 'name username')
    .sort({ createdAt: 1 });

  return sendSuccess(res, {
    message: 'Submission retrieved successfully',
    data: {
      submission,
      evidence,
    },
  });
});

/**
 * GET /api/teams/:teamId/submissions
 * List all submissions for a team.
 * Enforces team-level authorization.
 */
export const getTeamSubmissions = asyncHandler(async (req, res) => {
  const { teamId } = req.params;

  const team = await teamModel.findById(teamId);
  if (!team) {
    throw new AppError('Team not found', 404);
  }
  verifyTeamAccess(team, req.user);

  const submissions = await submissionModel
    .find({ teamId: team._id })
    .populate('submittedBy', 'name username')
    .sort({ createdAt: -1 });

  return sendSuccess(res, {
    message: 'Team submissions retrieved successfully',
    data: {
      teamId: team._id,
      submissions,
    },
  });
});

/**
 * POST /api/submissions/:submissionId/evidence
 * Upload an evidence file artifact for a draft submission.
 * Validates team authorization and draft state.
 */
export const uploadEvidence = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;

  if (!req.file) {
    throw new AppError('Please provide a file to upload', 400);
  }

  const submission = await submissionModel.findById(submissionId);
  if (!submission) {
    throw new AppError('Submission not found', 404);
  }

  const team = await teamModel.findById(submission.teamId);
  if (!team) {
    throw new AppError('Associated team not found', 404);
  }
  verifyTeamAccess(team, req.user);

  // Status check: Cannot attach evidence to submitted or evaluated submissions
  if (submission.status !== 'DRAFT') {
    throw new AppError(
      `Cannot upload evidence: Submission is in '${submission.status}' status (only DRAFT can be modified)`,
      400
    );
  }

  // Save binary via pluggable storage provider
  const { fileUrl, fileKey } = await storageService.saveFile(req.file);
  const evidenceType = resolveEvidenceType(req.file.mimetype);

  // Persist evidence metadata in MongoDB
  const evidence = await evidenceModel.create({
    submissionId: submission._id,
    type: evidenceType,
    storageKey: fileKey,
    url: fileUrl,
    originalName: sanitizeFilename(req.file.originalname),
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedBy: req.user._id,
    metadata: req.body.metadata ? JSON.parse(req.body.metadata || '{}') : {},
  });

  return sendCreated(res, {
    message: 'Evidence uploaded successfully',
    data: {
      evidence: {
        _id: evidence._id,
        submissionId: evidence.submissionId,
        type: evidence.type,
        url: evidence.url,
        originalName: evidence.originalName,
        mimeType: evidence.mimeType,
        size: evidence.size,
        createdAt: evidence.createdAt,
      },
    },
  });
});

/**
 * POST /api/submissions/:submissionId/submit
 * Finalize and submit a draft submission.
 * - Verifies team authorization
 * - Validates submission has content (evidence or reflection)
 * - Transitions state atomically from DRAFT -> SUBMITTED
 * - Emits SUBMISSION_SUBMITTED activity event upon success
 */
export const submitSubmission = asyncHandler(async (req, res) => {
  const { submissionId } = req.params;

  const submission = await submissionModel.findById(submissionId);
  if (!submission) {
    throw new AppError('Submission not found', 404);
  }

  const team = await teamModel.findById(submission.teamId);
  if (!team) {
    throw new AppError('Associated team not found', 404);
  }
  verifyTeamAccess(team, req.user);

  if (submission.status === 'SUBMITTED') {
    throw new AppError('Submission is already submitted', 400);
  }
  if (submission.status !== 'DRAFT') {
    throw new AppError(`Cannot submit: Submission is in '${submission.status}' status`, 400);
  }

  // Validate that submission contains either evidence or reflection
  const evidenceCount = await evidenceModel.countDocuments({ submissionId: submission._id });
  const hasReflection = submission.reflection && submission.reflection.trim().length > 0;

  if (evidenceCount === 0 && !hasReflection) {
    throw new AppError(
      'Cannot submit an empty submission. Please attach evidence files or provide a reflection.',
      400
    );
  }

  // Atomic state transition to SUBMITTED
  const updatedSubmission = await submissionModel.findOneAndUpdate(
    { _id: submission._id, status: 'DRAFT' },
    {
      $set: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        submittedBy: req.user._id,
      },
    },
    { new: true }
  );

  if (!updatedSubmission) {
    throw new AppError('Submission state conflict: Submission was already transitioned concurrently', 409);
  }

  // Record domain activity only after successful submission update
  await activityService.create({
    eventId: updatedSubmission.eventId,
    teamId: updatedSubmission.teamId,
    actorId: req.user._id,
    type: 'SUBMISSION_SUBMITTED',
    metadata: {
      submissionId: updatedSubmission._id,
      challengeId: updatedSubmission.challengeId,
      evidenceCount,
    },
  });

  return sendSuccess(res, {
    message: 'Submission successfully submitted!',
    data: {
      submission: updatedSubmission,
    },
  });
});

/**
 * POST /api/submissions/sync
 * Offline synchronization endpoint with idempotency guarantee.
 * When clientSubmissionId is supplied:
 * - If found: returns existing record safely without creating duplicates
 * - If new: creates cleanly, and optionally performs final submit if isFinalSubmit=true
 */
export const syncSubmission = asyncHandler(async (req, res) => {
  const {
    clientSubmissionId,
    teamId,
    eventId,
    challengeId,
    reflection,
    quantitativeData,
    isFinalSubmit = false,
  } = req.body;

  if (!clientSubmissionId || !clientSubmissionId.trim()) {
    throw new AppError('clientSubmissionId is required for offline sync', 400);
  }

  const cleanClientId = clientSubmissionId.trim();

  // Check if submission already exists (idempotency check)
  let submission = await submissionModel.findOne({ clientSubmissionId: cleanClientId });

  if (submission) {
    // If client requested final submit on retry and it was still DRAFT
    if (isFinalSubmit && submission.status === 'DRAFT') {
      submission.status = 'SUBMITTED';
      submission.submittedAt = new Date();
      await submission.save();

      await activityService.create({
        eventId: submission.eventId,
        teamId: submission.teamId,
        actorId: req.user._id,
        type: 'SUBMISSION_SUBMITTED',
        metadata: { submissionId: submission._id, synced: true },
      });
    }

    const evidence = await evidenceModel.find({ submissionId: submission._id });
    return sendSuccess(res, {
      message: 'Submission synced (existing record returned)',
      data: { submission, evidence, isExisting: true },
    });
  }

  // Create new submission
  if (!teamId || !eventId || !challengeId) {
    throw new AppError('teamId, eventId, and challengeId are required for new sync', 400);
  }

  const team = await teamModel.findById(teamId);
  if (!team) {
    throw new AppError('Team not found', 404);
  }
  verifyTeamAccess(team, req.user);

  // Verify challenge and team participation if challenge exists in catalog
  const challenge = await challengeModel.findById(challengeId);
  if (challenge) {
    if (challenge.eventId.toString() !== team.eventId.toString()) {
      throw new AppError('Challenge does not belong to the event associated with this team', 400);
    }
    const participation = await teamChallengeModel.findOne({
      teamId: team._id,
      challengeId: challenge._id,
      status: { $in: ['JOINED', 'ACTIVE'] },
    });
    if (!participation) {
      throw new AppError('Team is not participating in this challenge. Please join the challenge first.', 400);
    }
  }

  try {
    const status = isFinalSubmit ? 'SUBMITTED' : 'DRAFT';
    const submittedAt = isFinalSubmit ? new Date() : null;

    submission = await submissionModel.create({
      clientSubmissionId: cleanClientId,
      teamId: team._id,
      eventId: new mongoose.Types.ObjectId(eventId),
      challengeId: new mongoose.Types.ObjectId(challengeId),
      submittedBy: req.user._id,
      reflection: reflection ? reflection.trim() : '',
      quantitativeData: quantitativeData || {},
      status,
      submittedAt,
    });

    const activityType = isFinalSubmit ? 'SUBMISSION_SUBMITTED' : 'SUBMISSION_CREATED';
    await activityService.create({
      eventId: submission.eventId,
      teamId: team._id,
      actorId: req.user._id,
      type: activityType,
      metadata: { submissionId: submission._id, clientSubmissionId: cleanClientId },
    });

    return sendCreated(res, {
      message: 'Submission synced and created successfully',
      data: { submission, evidence: [], isExisting: false },
    });
  } catch (err) {
    // Catch concurrent duplicate key race conditions on clientSubmissionId
    if (err.code === 11000 && err.keyPattern && err.keyPattern.clientSubmissionId) {
      const concurrentRecord = await submissionModel.findOne({ clientSubmissionId: cleanClientId });
      const evidence = await evidenceModel.find({ submissionId: concurrentRecord._id });
      return sendSuccess(res, {
        message: 'Submission synced (concurrent record returned)',
        data: { submission: concurrentRecord, evidence, isExisting: true },
      });
    }
    throw err;
  }
});

export default {
  createSubmission,
  getSubmissionById,
  getTeamSubmissions,
  uploadEvidence,
  submitSubmission,
  syncSubmission,
};
