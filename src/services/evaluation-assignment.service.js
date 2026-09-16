import mongoose from 'mongoose';
import EventEvaluator from '../models/eventEvaluator.model.js';
import Evaluation from '../models/evaluation.model.js';
import Event from '../models/event.model.js';
import Submission from '../models/submission.model.js';
import Task from '../models/task.model.js';
import Team from '../models/team.model.js';

export function filterEligibleEvaluators(evaluators = [], teamCollegeId, maxPendingAssignments) {
  return evaluators.filter((entry) => {
    const evaluatorCollegeId = entry.evaluator?.collegeId
      ? String(entry.evaluator.collegeId)
      : entry.collegeId
        ? String(entry.collegeId)
        : null;

    const sameCollege = evaluatorCollegeId && teamCollegeId && String(evaluatorCollegeId) === String(teamCollegeId);
    const belowThreshold = Number(entry.pendingCount || 0) < Number(maxPendingAssignments || 0);
    const active = entry.isActive !== false;
    return active && !sameCollege && belowThreshold;
  });
}

export function selectLeastLoadedEvaluator(eligibleEvaluators = []) {
  if (!eligibleEvaluators.length) {
    return null;
  }

  const lowestPending = Math.min(...eligibleEvaluators.map((entry) => Number(entry.pendingCount || 0)));
  const candidates = eligibleEvaluators.filter((entry) => Number(entry.pendingCount || 0) === lowestPending);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export async function assignEvaluationForSubmission({ submissionId, eventId, teamId, taskId, teamCollegeId }) {
  const submission = await Submission.findById(submissionId).lean();
  if (!submission) {
    return { created: false, reason: 'Submission not found' };
  }

  const event = await Event.findById(eventId).lean();
  if (!event) {
    return { created: false, reason: 'Event not found' };
  }

  const task = await Task.findById(taskId).lean();
  if (!task) {
    return { created: false, reason: 'Task not found' };
  }

  const team = await Team.findById(teamId).lean();
  if (!team) {
    return { created: false, reason: 'Team not found' };
  }

  const maxPendingAssignments = Number(event.evaluatorConfig?.maxPendingAssignments || 3);
  const assignedRecords = await EventEvaluator.find({ eventId, isActive: true }).populate('evaluatorId');

  const eligible = filterEligibleEvaluators(
    assignedRecords.map((entry) => ({
      ...entry.toObject(),
      evaluator: entry.evaluatorId ? { collegeId: entry.evaluatorId.collegeId } : null,
    })),
    teamCollegeId || team.collegeId,
    maxPendingAssignments,
  );

  if (!eligible.length) {
    return { created: false, reason: 'No eligible evaluator available' };
  }

  const chosen = selectLeastLoadedEvaluator(eligible);
  if (!chosen) {
    return { created: false, reason: 'No evaluator selected' };
  }

  const session = await mongoose.startSession();
  let created = null;

  try {
    await session.withTransaction(async () => {
      const existingEvaluation = await Evaluation.findOne({ submissionId, evaluatorId: chosen.evaluatorId }).session(session);
      if (existingEvaluation) {
        created = existingEvaluation;
        return;
      }

      const evaluation = await Evaluation.create([{
        submissionId,
        eventId,
        taskId,
        teamId,
        evaluatorId: chosen.evaluatorId,
        criteria: [],
        totalScore: 0,
        feedback: '',
        status: 'ASSIGNED',
        assignedAt: new Date(),
      }], { session });

      await EventEvaluator.findByIdAndUpdate(chosen._id, {
        $inc: { assignedCount: 1, pendingCount: 1 },
      }, { session });

      created = evaluation[0];
    });
  } finally {
    await session.endSession();
  }

  return { created: true, evaluation: created };
}
