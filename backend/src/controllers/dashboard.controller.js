import dashboardService from '../services/dashboard.service.js';
import activityService from '../services/activity.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

/**
 * GET /api/teams/:teamId/dashboard
 * Retrieve aggregated team dashboard read-model for the student dashboard.
 * Requires verified team membership (enforced via requireTeamMember middleware).
 */
export const getTeamDashboard = asyncHandler(async (req, res) => {
  const { teamId } = req.params;

  const dashboardData = await dashboardService.getTeamDashboardData(teamId, req.user._id);

  return sendSuccess(res, {
    message: 'Team dashboard retrieved successfully',
    data: dashboardData,
  });
});

/**
 * GET /api/teams/:teamId/activity
 * Retrieve paginated team activity history.
 * Requires verified team membership (enforced via requireTeamMember middleware).
 */
export const getTeamActivity = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const { page, limit } = req.query;

  const result = await activityService.getTeamActivity({
    teamId,
    page,
    limit,
  });

  return sendSuccess(res, {
    message: 'Team activity retrieved successfully',
    data: result,
  });
});

export default {
  getTeamDashboard,
  getTeamActivity,
};
