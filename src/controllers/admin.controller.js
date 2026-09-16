import College from '../models/college.model.js';
import Event from '../models/event.model.js';
import Task from '../models/task.model.js';
import Team from '../models/team.model.js';
import Submission from '../models/submission.model.js';
import EventEvaluator from '../models/eventEvaluator.model.js';
import Evaluation from '../models/evaluation.model.js';
import userModel from '../models/user.model.js';
import crypto from 'crypto';
import { calculateTotalScore } from '../services/scoring.service.js';
import { getLeaderboardData } from '../services/leaderboard.service.js';
import { getEventAnalytics } from '../services/analytics.service.js';
import AuditLog from '../models/auditLog.model.js';

function jsonSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({ success: true, data });
}

function jsonError(res, message, statusCode = 400) {
  return res.status(statusCode).json({ success: false, message });
}

export async function createCollege(req, res) {
  try {
    const { name, code, location } = req.body;
    if (!name || !code) {
      return jsonError(res, 'College name and code are required');
    }

    const college = await College.create({ name, code, location });
    await AuditLog.create({ userId: req.user._id, action: 'EVENT_CREATED', entityType: 'College', entityId: college._id, metadata: { name, code } });
    return jsonSuccess(res, college, 201);
  } catch (error) {
    return jsonError(res, error.message || 'Failed to create college', 409);
  }
}

export async function listColleges(req, res) {
  const colleges = await College.find().sort({ createdAt: -1 });
  return jsonSuccess(res, colleges);
}

export async function getCollegeById(req, res) {
  const college = await College.findById(req.params.id);
  if (!college) return jsonError(res, 'College not found', 404);
  return jsonSuccess(res, college);
}

export async function updateCollege(req, res) {
  const college = await College.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!college) return jsonError(res, 'College not found', 404);
  return jsonSuccess(res, college);
}

export async function createEvent(req, res) {
  try {
    const { name, description, startDate, endDate, participatingColleges, teamConfig, evaluatorConfig } = req.body;
    if (!name || !startDate || !endDate) {
      return jsonError(res, 'Name, startDate, and endDate are required');
    }
    if (new Date(startDate) >= new Date(endDate)) {
      return jsonError(res, 'startDate must be before endDate');
    }
    if (teamConfig && teamConfig.minMembers && teamConfig.maxMembers && teamConfig.maxMembers < teamConfig.minMembers) {
      return jsonError(res, 'maxMembers must be >= minMembers');
    }
    if (Array.isArray(participatingColleges) && participatingColleges.length) {
      const colleges = await College.find({ _id: { $in: participatingColleges } });
      if (colleges.length !== participatingColleges.length) {
        return jsonError(res, 'One or more participating colleges do not exist');
      }
    }

    const event = await Event.create({
      name,
      description,
      startDate,
      endDate,
      participatingColleges: participatingColleges || [],
      teamConfig: teamConfig || { minMembers: 1, maxMembers: 5 },
      evaluatorConfig: evaluatorConfig || { maxPendingAssignments: 3 },
      createdBy: req.user._id,
      status: 'DRAFT',
    });

    await AuditLog.create({ userId: req.user._id, action: 'EVENT_CREATED', entityType: 'Event', entityId: event._id, metadata: { name } });
    return jsonSuccess(res, event, 201);
  } catch (error) {
    return jsonError(res, error.message || 'Failed to create event', 409);
  }
}

export async function listEvents(req, res) {
  const events = await Event.find().sort({ createdAt: -1 });
  return jsonSuccess(res, events);
}

export async function getEventById(req, res) {
  const event = await Event.findById(req.params.id);
  if (!event) return jsonError(res, 'Event not found', 404);
  return jsonSuccess(res, event);
}

export async function updateEvent(req, res) {
  const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!event) return jsonError(res, 'Event not found', 404);
  return jsonSuccess(res, event);
}

export async function deleteEvent(req, res) {
  const event = await Event.findByIdAndDelete(req.params.id);
  if (!event) return jsonError(res, 'Event not found', 404);
  return jsonSuccess(res, { deleted: true });
}

export async function createEvaluator(req, res) {
  try {
    const { username, email, password, phone, collegeId } = req.body;
    if (!username || !email || !password || !collegeId) {
      return jsonError(res, 'username, email, password, and collegeId are required');
    }

    const college = await College.findById(collegeId);
    if (!college) return jsonError(res, 'College not found', 404);

    const existing = await userModel.findOne({ $or: [{ username }, { email }] });
    if (existing) return jsonError(res, 'Username or email already exists', 409);

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    const user = await userModel.create({
      username,
      email,
      password: hashedPassword,
      phone,
      role: 'EVALUATOR',
      collegeId,
      verified: true,
      isActive: true,
    });

    await AuditLog.create({ userId: req.user._id, action: 'EVALUATOR_CREATED', entityType: 'User', entityId: user._id, metadata: { username, email, collegeId } });

    return jsonSuccess(res, {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      collegeId: user.collegeId,
    }, 201);
  } catch (error) {
    return jsonError(res, error.message || 'Failed to create evaluator', 409);
  }
}

export async function listEvaluators(req, res) {
  const evaluators = await userModel.find({ role: 'EVALUATOR' }).select('-password').populate('collegeId');
  return jsonSuccess(res, evaluators);
}

export async function getEvaluatorById(req, res) {
  const evaluator = await userModel.findById(req.params.id).select('-password').populate('collegeId');
  if (!evaluator) return jsonError(res, 'Evaluator not found', 404);
  return jsonSuccess(res, evaluator);
}

export async function updateEvaluator(req, res) {
  const evaluator = await userModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).select('-password');
  if (!evaluator) return jsonError(res, 'Evaluator not found', 404);
  return jsonSuccess(res, evaluator);
}

export async function addEvaluatorToEvent(req, res) {
  const { eventId } = req.params;
  const { evaluatorId, isActive = true } = req.body;

  const event = await Event.findById(eventId);
  if (!event) return jsonError(res, 'Event not found', 404);

  const evaluator = await userModel.findById(evaluatorId);
  if (!evaluator || evaluator.role !== 'EVALUATOR') return jsonError(res, 'Evaluator not found or invalid role', 404);

  const existing = await EventEvaluator.findOne({ eventId, evaluatorId });
  if (existing) return jsonSuccess(res, existing);

  const record = await EventEvaluator.create({ eventId, evaluatorId, isActive, assignedCount: 0, completedCount: 0, pendingCount: 0 });
  await AuditLog.create({ userId: req.user._id, action: 'EVALUATOR_ASSIGNED', entityType: 'EventEvaluator', entityId: record._id, metadata: { eventId, evaluatorId } });
  return jsonSuccess(res, record, 201);
}

export async function listEventEvaluators(req, res) {
  const items = await EventEvaluator.find({ eventId: req.params.eventId }).populate('evaluatorId');
  return jsonSuccess(res, items);
}

export async function patchEventEvaluator(req, res) {
  const record = await EventEvaluator.findOneAndUpdate(
    { eventId: req.params.eventId, evaluatorId: req.params.evaluatorId },
    { isActive: req.body.isActive },
    { new: true }
  );
  if (!record) return jsonError(res, 'Assignment not found', 404);
  return jsonSuccess(res, record);
}

export async function removeEventEvaluator(req, res) {
  const result = await EventEvaluator.findOneAndDelete({ eventId: req.params.eventId, evaluatorId: req.params.evaluatorId });
  if (!result) return jsonError(res, 'Assignment not found', 404);
  return jsonSuccess(res, { deleted: true });
}

export async function createTask(req, res) {
  const { eventId } = req.params;
  const { title, description, instructions, startDate, deadline, maxScore, evidenceRequirements, evaluationMetrics, impactMetrics, status } = req.body;
  const event = await Event.findById(eventId);
  if (!event) return jsonError(res, 'Event not found', 404);

  const task = await Task.create({
    eventId,
    title,
    description,
    instructions,
    startDate,
    deadline,
    maxScore,
    evidenceRequirements: evidenceRequirements || [],
    evaluationMetrics: evaluationMetrics || [],
    impactMetrics: impactMetrics || [],
    status: status || 'DRAFT',
  });

  await AuditLog.create({ userId: req.user._id, action: 'TASK_CREATED', entityType: 'Task', entityId: task._id, metadata: { eventId } });
  return jsonSuccess(res, task, 201);
}

export async function listEventTasks(req, res) {
  const tasks = await Task.find({ eventId: req.params.eventId }).sort({ createdAt: -1 });
  return jsonSuccess(res, tasks);
}

export async function getTaskById(req, res) {
  const task = await Task.findById(req.params.id);
  if (!task) return jsonError(res, 'Task not found', 404);
  return jsonSuccess(res, task);
}

export async function updateTask(req, res) {
  const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!task) return jsonError(res, 'Task not found', 404);
  return jsonSuccess(res, task);
}

export async function deleteTask(req, res) {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return jsonError(res, 'Task not found', 404);
  return jsonSuccess(res, { deleted: true });
}

export async function listEventTeams(req, res) {
  const teams = await Team.find({ eventId: req.params.eventId }).populate('collegeId').populate('captainId');
  return jsonSuccess(res, teams);
}

export async function getTeamById(req, res) {
  const team = await Team.findById(req.params.id).populate('collegeId').populate('captainId');
  if (!team) return jsonError(res, 'Team not found', 404);
  return jsonSuccess(res, team);
}

export async function listEventSubmissions(req, res) {
  const submissions = await Submission.find({ eventId: req.params.eventId }).populate('teamId').populate('taskId').populate('submittedBy');
  return jsonSuccess(res, submissions);
}

export async function getSubmissionById(req, res) {
  const submission = await Submission.findById(req.params.id).populate('teamId').populate('taskId').populate('submittedBy');
  if (!submission) return jsonError(res, 'Submission not found', 404);
  return jsonSuccess(res, submission);
}

export async function getLeaderboard(req, res) {
  const data = await getLeaderboardData(req.params.eventId);
  return jsonSuccess(res, data);
}

export async function getEventAnalyticsController(req, res) {
  const data = await getEventAnalytics(req.params.eventId);
  return jsonSuccess(res, data);
}

export async function getHistoricalAnalytics(req, res) {
  const events = await Event.find({}).lean();
  const analytics = [];

  for (const event of events) {
    const summary = await getEventAnalytics(event._id.toString());
    analytics.push({ eventId: event._id, name: event.name, ...summary });
  }

  return jsonSuccess(res, analytics);
}

export async function getAdminDashboard(req, res) {
  const totalTeams = await Team.countDocuments();
  const totalStudents = await userModel.countDocuments({ role: 'STUDENT' });
  const totalEvaluators = await userModel.countDocuments({ role: 'EVALUATOR' });
  const totalEvents = await Event.countDocuments();

  return jsonSuccess(res, {
    totalTeams,
    totalStudents,
    totalEvaluators,
    totalEvents,
  });
}

export async function getAdminEvaluations(req, res) {
  const evaluations = await Evaluation.find().populate('submissionId').populate('teamId').populate('evaluatorId');
  return jsonSuccess(res, evaluations);
}

export async function getAdminSubmissionEvidence(req, res) {
  const submission = await Submission.findById(req.params.submissionId);
  if (!submission) return jsonError(res, 'Submission not found', 404);
  return jsonSuccess(res, submission.evidence || []);
}
