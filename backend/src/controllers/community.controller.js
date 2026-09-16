import activityService from '../services/activity.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

/**
 * GET /api/community/feed
 * Retrieve paginated public community activity feed.
 * Accessible to authenticated students to view competition-wide milestones.
 */
export const getCommunityFeed = asyncHandler(async (req, res) => {
  const { eventId, page, limit } = req.query;

  const result = await activityService.getCommunityFeed({
    eventId,
    page,
    limit,
  });

  return sendSuccess(res, {
    message: 'Community activity feed retrieved successfully',
    data: result,
  });
});

export default {
  getCommunityFeed,
};
