import Evaluation from '../models/evaluation.model.js';
import Submission from '../models/submission.model.js';
import Task from '../models/task.model.js';
import Event from '../models/event.model.js';
import Team from '../models/team.model.js';
import EventEvaluator from '../models/eventEvaluator.model.js';
import AuditLog from '../models/auditLog.model.js';
import { calculateTotalScore, validateCriteria } from '../services/scoring.service.js';

function jsonSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function jsonError(res, message, statusCode = 400) {
  return res.status(statusCode).json({ success: false, message });
}

export async function getDashboard(req, res) {
  const evaluations = await Evaluation.find({ evaluatorId: req.user._id }).populate('submissionId').populate('teamId').populate('taskId');
  return jsonSuccess(res, {
    totalAssigned: evaluations.length,
    completed: evaluations.filter((item) => item.status === 'COMPLETED').length,
    pending: evaluations.filter((item) => item.status !== 'COMPLETED').length,
    items: evaluations,
  });
}

export async function listEvaluations(req, res) {
  const evaluations = await Evaluation.find({ evaluatorId: req.user._id }).populate('submissionId').populate('taskId').populate('teamId');
  return jsonSuccess(res, evaluations);
}

export async function getEvaluationById(req, res) {
  const evaluation = await Evaluation.findOne({ _id: req.params.id, evaluatorId: req.user._id }).populate('submissionId').populate('taskId').populate('teamId');
  if (!evaluation) return jsonError(res, 'Evaluation not found or not assigned to you', 404);
  return jsonSuccess(res, evaluation);
}

export async function patchEvaluation(req, res) {
  const evaluation = await Evaluation.findOne({ _id: req.params.id, evaluatorId: req.user._id });
  if (!evaluation) return jsonError(res, 'Evaluation not found or not assigned to you', 404);

  const updates = { ...req.body };
  if (updates.criteria) {
    updates.criteria = updates.criteria.map((criterion) => ({
      ...criterion,
      score: Number(criterion.score),
      maxScore: Number(criterion.maxScore),
    }));
  }

  Object.assign(evaluation, updates);
  await evaluation.save();
  return jsonSuccess(res, evaluation);
}

export async function submitEvaluation(req, res) {
  try {
    const evaluation = await Evaluation.findOne({ _id: req.params.id, evaluatorId: req.user._id });
    if (!evaluation) return jsonError(res, 'Evaluation not found or not assigned to you', 404);

    const submission = await Submission.findById(evaluation.submissionId);
    if (!submission) return jsonError(res, 'Submission not found', 404);

    const task = await Task.findById(evaluation.taskId);
    if (!task) return jsonError(res, 'Task not found', 404);

    const event = await Event.findById(evaluation.eventId);
    if (!event) return jsonError(res, 'Event not found', 404);

    const team = await Team.findById(evaluation.teamId);
    if (!team) return jsonError(res, 'Team not found', 404);

    const eventAssignment = await EventEvaluator.findOne({ eventId: evaluation.eventId, evaluatorId: req.user._id });
    if (!eventAssignment || eventAssignment.isActive === false) return jsonError(res, 'Evaluator is not assigned to this event', 403);

    if (String(team.collegeId) === String(req.user.collegeId)) {
      return jsonError(res, 'Evaluator cannot evaluate a team from their own college', 403);
    }

    const criteria = Array.isArray(req.body.criteria) ? req.body.criteria : evaluation.criteria;
    if (!criteria.length) return jsonError(res, 'At least one criterion is required', 400);

    const totalScore = validateCriteria(criteria, task.maxScore);

    evaluation.criteria = criteria.map((criterion) => ({
      name: criterion.name,
      score: Number(criterion.score),
      maxScore: Number(criterion.maxScore || 0),
      comment: criterion.comment || '',
    }));
    evaluation.totalScore = totalScore;
    evaluation.feedback = req.body.feedback || '';
    evaluation.status = 'COMPLETED';
    evaluation.evaluatedAt = new Date();
    await evaluation.save();

    submission.status = 'APPROVED';
    submission.submittedAt = submission.submittedAt || new Date();
    await submission.save();

    if (eventAssignment.pendingCount > 0) {
      eventAssignment.pendingCount -= 1;
    }
    eventAssignment.completedCount += 1;
    await eventAssignment.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'EVALUATION_SUBMITTED',
      entityType: 'Evaluation',
      entityId: evaluation._id,
      metadata: { submissionId: submission._id, totalScore },
    });

    return jsonSuccess(res, {
      evaluation,
      totalScore,
      submissionStatus: submission.status,
    });
  } catch (error) {
    return jsonError(res, error.message || 'Failed to submit evaluation', 400);
  }
}

export async function getEvidenceForEvaluation(req, res) {
  const evaluation = await Evaluation.findOne({ _id: req.params.id, evaluatorId: req.user._id }).populate('submissionId');
  if (!evaluation) return jsonError(res, 'Evaluation not found or not assigned to you', 404);

  const submission = await Submission.findById(evaluation.submissionId);
  if (!submission) return jsonError(res, 'Submission not found', 404);

  if (!req.params.fileName) return jsonSuccess(res, submission.evidence || []);

  const filePath = submission.evidence.find((entry) => entry.filename === req.params.fileName || entry.path.endsWith(req.params.fileName))?.path;
  if (!filePath) return jsonError(res, 'File not found', 404);

  return res.download(filePath);
}
