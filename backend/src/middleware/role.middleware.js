import teamModel from '../models/team.model.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Middleware: Verify that the authenticated user is an active member of the specified team
 * or has platform-level ADMIN privileges.
 * Attaches `req.team` and `req.teamMember` to the request object.
 */
export const requireTeamMember = (paramKey = 'teamId') => {
  return asyncHandler(async (req, res, next) => {
    const teamId = req.params[paramKey];
    if (!teamId) {
      throw new AppError('Team ID parameter is required', 400);
    }

    const team = await teamModel.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Admins have override access
    if (req.user.role === 'ADMIN') {
      req.team = team;
      return next();
    }

    // Find active membership
    const member = team.members.find(
      (m) => m.user.toString() === req.user._id.toString() && m.status === 'ACTIVE'
    );

    if (!member) {
      throw new AppError('Access denied: You are not an active member of this team.', 403);
    }

    req.team = team;
    req.teamMember = member;
    next();
  });
};

/**
 * Middleware: Verify that the authenticated user is the active LEAD of the specified team
 * or has platform-level ADMIN privileges.
 */
export const requireTeamLead = (paramKey = 'teamId') => {
  return asyncHandler(async (req, res, next) => {
    const teamId = req.params[paramKey];
    if (!teamId) {
      throw new AppError('Team ID parameter is required', 400);
    }

    const team = await teamModel.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Admins have override access
    if (req.user.role === 'ADMIN') {
      req.team = team;
      return next();
    }

    const member = team.members.find(
      (m) => m.user.toString() === req.user._id.toString() && m.status === 'ACTIVE'
    );

    if (!member || member.role !== 'LEAD') {
      throw new AppError('Access denied: Only the team lead can perform this action.', 403);
    }

    req.team = team;
    req.teamMember = member;
    next();
  });
};

export default { requireTeamMember, requireTeamLead };
