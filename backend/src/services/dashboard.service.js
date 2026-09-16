import teamModel from '../models/team.model.js';
import eventModel from '../models/event.model.js';
import teamChallengeModel from '../models/teamChallenge.model.js';
import submissionModel from '../models/submission.model.js';
import evidenceModel from '../models/evidence.model.js';
import activityModel from '../models/activity.model.js';
import notificationModel from '../models/notification.model.js';
import AppError from '../utils/AppError.js';

/**
 * Dashboard Service.
 * Aggregates all team, event, participation, submission, and activity read-models
 * into a single high-performance payload for the student dashboard.
 */
export const getTeamDashboardData = async (teamId, userId) => {
  // 1. Fetch team with populated member user details
  const team = await teamModel
    .findById(teamId)
    .populate('members.user', 'name username email')
    .populate('createdBy', 'name username email');

  if (!team) {
    throw new AppError('Team not found', 404);
  }

  // 2. Run queries in parallel to avoid sequential N+1 delays
  const [
    event,
    participations,
    submissions,
    recentActivity,
    unreadNotifications,
  ] = await Promise.all([
    // Event context
    eventModel.findById(team.eventId),

    // All active challenge participations for this team
    teamChallengeModel
      .find({ teamId: team._id, status: { $ne: 'WITHDRAWN' } })
      .populate('challengeId')
      .sort({ joinedAt: -1 }),

    // All team submissions
    submissionModel
      .find({ teamId: team._id })
      .populate('challengeId', 'title track')
      .populate('submittedBy', 'name username')
      .sort({ createdAt: -1 }),

    // Latest 10 team domain activity events
    activityModel
      .find({ teamId: team._id })
      .populate('actorId', 'name username')
      .sort({ createdAt: -1 })
      .limit(10),

    // Latest 5 unread notifications for the requesting student
    notificationModel
      .find({ recipient: userId, read: false })
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  // 3. Count evidence files across all team submissions
  const submissionIds = submissions.map((s) => s._id);
  let totalEvidenceCount = 0;
  let evidenceCountMap = new Map();

  if (submissionIds.length > 0) {
    const evidenceCounts = await evidenceModel.aggregate([
      { $match: { submissionId: { $in: submissionIds } } },
      { $group: { _id: '$submissionId', count: { $sum: 1 } } },
    ]);
    evidenceCounts.forEach((e) => {
      evidenceCountMap.set(e._id.toString(), e.count);
      totalEvidenceCount += e.count;
    });
  }

  // 4. Derive actual statistics from DB state (strictly no fabricated ranks or scores)
  const stats = {
    challengesJoined: participations.length,
    submissions: submissions.length,
    submittedSubmissions: submissions.filter((s) =>
      ['SUBMITTED', 'UNDER_REVIEW', 'EVALUATED'].includes(s.status)
    ).length,
    completedChallenges: participations.filter((p) => p.status === 'COMPLETED').length,
    evidenceFiles: totalEvidenceCount,
    membersCount: team.members.filter((m) => m.status === 'ACTIVE').length,
    totalMembers: team.members.filter((m) => m.status === 'ACTIVE').length,
  };

  const submissionsWithEvidence = submissions.map((sub) => {
    const obj = sub.toObject ? sub.toObject() : { ...sub };
    return {
      ...obj,
      evidenceCount: evidenceCountMap.get(sub._id.toString()) || 0,
    };
  });

  return {
    team: {
      _id: team._id,
      name: team.name,
      joinCode: team.joinCode,
      status: team.status,
      finalizedAt: team.finalizedAt,
      members: team.members,
      createdBy: team.createdBy,
      createdAt: team.createdAt,
    },
    event: event ? {
      _id: event._id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      status: event.status,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationEndDate: event.registrationEndDate,
      teamSize: event.teamSize,
      organizer: event.organizer,
      visibility: event.visibility,
    } : null,
    stats,
    challenges: participations.map((p) => ({
      participationId: p._id,
      status: p.status,
      joinedAt: p.joinedAt,
      completedAt: p.completedAt,
      challenge: p.challengeId,
    })),
    submissions: submissionsWithEvidence,
    recentActivity,
    achievements: [],
    notifications: unreadNotifications,
  };
};

export default {
  getTeamDashboardData,
};
