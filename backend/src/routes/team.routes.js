import { Router } from 'express';
import authenticate from '../middleware/auth.middleware.js';
import { requireTeamMember, requireTeamLead } from '../middleware/role.middleware.js';
import * as teamController from '../controllers/team.controller.js';
import * as invitationController from '../controllers/invitation.controller.js';

const router = Router();

// All team routes require an authenticated user
router.use(authenticate);

// ─── Team Details & Member Roster (Member-Authorized) ────────────────────────
router.get('/:teamId', requireTeamMember('teamId'), teamController.getTeam);
router.get('/:teamId/members', requireTeamMember('teamId'), teamController.getTeamMembers);

// ─── Team Lead Operations ────────────────────────────────────────────────────
router.post(
  '/:teamId/members/invite',
  requireTeamLead('teamId'),
  invitationController.inviteMember
);
router.post(
  '/:teamId/finalize',
  requireTeamLead('teamId'),
  teamController.finalizeTeam
);
router.patch(
  '/:teamId/lead',
  requireTeamLead('teamId'),
  teamController.reassignLead
);

export default router;
