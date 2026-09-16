import activityModel from '../models/activity.model.js';

/**
 * Activity Service.
 * Centralized service to record domain events (milestones, submissions, finalizations)
 * without coupling models directly across controllers.
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
    // Log error but do not throw unhandled exception to prevent breaking primary workflow
    console.error(`⚠️ Failed to record activity (${type}):`, error.message);
    return null;
  }
};

export default { create };
