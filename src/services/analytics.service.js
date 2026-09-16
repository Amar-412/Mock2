import Team from '../models/team.model.js';
import TeamMembership from '../models/teamMembership.model.js';
import Submission from '../models/submission.model.js';
import Evaluation from '../models/evaluation.model.js';
import Event from '../models/event.model.js';
import College from '../models/college.model.js';
import userModel from '../models/user.model.js';

export async function getEventAnalytics(eventId) {
  const event = await Event.findById(eventId).lean();
  if (!event) {
    return { eventId, message: 'Event not found' };
  }

  const participatingColleges = event.participatingColleges?.length || 0;
  const teams = await Team.countDocuments({ eventId });
  const students = await TeamMembership.countDocuments({ eventId });
  const submissions = await Submission.countDocuments({ eventId });
  const evaluatedSubmissions = await Evaluation.countDocuments({ eventId });
  const pendingEvaluations = await Evaluation.countDocuments({ eventId, status: { $ne: 'COMPLETED' } });

  const averageScoreDoc = await Evaluation.aggregate([
    { $match: { eventId: event._id } },
    { $group: { _id: null, avgScore: { $avg: '$totalScore' } } },
  ]);

  const averageScore = averageScoreDoc[0]?.avgScore ?? 0;
  const completionRate = submissions ? (evaluatedSubmissions / submissions) * 100 : 0;

  const teamProgress = await Team.aggregate([
    { $match: { eventId: event._id } },
    { $lookup: { from: 'teammemberships', localField: '_id', foreignField: 'teamId', as: 'members' } },
    { $lookup: { from: 'colleges', localField: 'collegeId', foreignField: '_id', as: 'college' } },
    { $lookup: { from: 'submissions', localField: '_id', foreignField: 'teamId', as: 'submissions' } },
    { $project: {
        team: '$name',
        college: { $arrayElemAt: ['$college.name', 0] },
        memberCount: { $size: '$members' },
        tasks: { $size: '$submissions' },
        submittedTasks: { $size: '$submissions' },
        evaluatedTasks: { $literal: 0 },
        completionPercentage: { $ifNull: [{ $multiply: [{ $divide: [{ $size: '$submissions' }, 1] }, 100] }, 0] },
        score: { $sum: '$submissions.totalScore' },
        status: '$status',
      } }
  ]);

  const evaluatorWorkload = await Evaluation.aggregate([
    { $match: { eventId: event._id } },
    { $lookup: { from: 'users', localField: 'evaluatorId', foreignField: '_id', as: 'evaluator' } },
    { $group: { _id: '$evaluatorId', assigned: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } }, pending: { $sum: { $cond: [{ $ne: ['$status', 'COMPLETED'] }, 1, 0] } } } },
    { $project: { evaluator: { $arrayElemAt: ['$evaluator.username', 0] }, college: { $arrayElemAt: ['$evaluator.collegeId', 0] }, assigned: 1, pending: 1, completed: 1, threshold: 3, active: true } },
  ]);

  const collegeAnalytics = await Team.aggregate([
    { $match: { eventId: event._id } },
    { $lookup: { from: 'colleges', localField: 'collegeId', foreignField: '_id', as: 'college' } },
    { $lookup: { from: 'teammemberships', localField: '_id', foreignField: 'teamId', as: 'members' } },
    { $lookup: { from: 'submissions', localField: '_id', foreignField: 'teamId', as: 'submissions' } },
    { $group: {
        _id: '$collegeId',
        college: { $first: { $arrayElemAt: ['$college.name', 0] } },
        teams: { $sum: 1 },
        students: { $sum: { $size: '$members' } },
        submissions: { $sum: { $size: '$submissions' } },
        completion: { $avg: { $size: '$submissions' } },
        totalScore: { $sum: { $sum: '$submissions.totalScore' } },
      } }
  ]);

  return {
    event: event.name,
    participatingColleges,
    registeredTeams: teams,
    students,
    submissions,
    evaluatedSubmissions,
    pendingEvaluations,
    completionRate,
    averageScore,
    teamProgress,
    evaluatorWorkload,
    collegeAnalytics,
  };
}
