import activityModel from '../models/activity.model.js';

/**
 * Activity Service.
 * Centralized service to record domain events (milestones, submissions, finalizations)
 * and query team activity streams and public community feeds.
 */

/**
 * Record a domain activity event.
 */
export const create = async ({
  eventId,
  teamId = null,
  actorId,
  type,
  metadata = {},
  visibility = 'EVENT',
}) => {
  try {
    const activity = await activityModel.create({
      eventId,
      teamId,
      actorId,
      type,
      metadata,
      visibility,
    });
    return activity;
  } catch (error) {
    console.error(`⚠️ Failed to record activity (${type}):`, error.message);
    return null;
  }
};

/**
 * Retrieve paginated activity feed for a specific team.
 */
export const getTeamActivity = async ({ teamId, page = 1, limit = 20 }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter = { teamId };

  const [activities, total] = await Promise.all([
    activityModel
      .find(filter)
      .populate('actorId', 'name username')
      .populate('teamId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    activityModel.countDocuments(filter),
  ]);

  return {
    items: activities,
    activities,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Retrieve paginated public community activity feed across all teams/events.
 * Strictly exposes only safe PUBLIC events.
 */
export const getCommunityFeed = async ({ eventId = null, page = 1, limit = 20 }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter = { visibility: 'PUBLIC' };
  if (eventId) {
    filter.eventId = eventId;
  }

  const [items, total] = await Promise.all([
    activityModel
      .find(filter)
      .populate('actorId', 'name username')
      .populate('teamId', 'name')
      .populate('eventId', 'title slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    activityModel.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

export default {
  create,
  getTeamActivity,
  getCommunityFeed,
};
