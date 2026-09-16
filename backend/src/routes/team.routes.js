import { Router } from 'express';
import authenticate from '../middleware/auth.middleware.js';
import { requireTeamMember, requireTeamLead } from '../middleware/role.middleware.js';
import * as teamController from '../controllers/team.controller.js';
import * as invitationController from '../controllers/invitation.controller.js';
import * as submissionController from '../controllers/submission.controller.js';
import * as challengeController from '../controllers/challenge.controller.js';

const router = Router();

// All team routes require an authenticated user
router.use(authenticate);

// ─── Team Details & Member Roster (Member-Authorized) ────────────────────────
router.get('/:teamId', requireTeamMember('teamId'), teamController.getTeam);
router.get('/:teamId/members', requireTeamMember('teamId'), teamController.getTeamMembers);
router.get('/:teamId/submissions', requireTeamMember('teamId'), submissionController.getTeamSubmissions);

// ─── Team Challenge Participation ────────────────────────────────────────────
router.post(
  '/:teamId/challenges',
  requireTeamMember('teamId'),
  challengeController.joinTeamChallenge
);
router.get(
  '/:teamId/challenges',
  requireTeamMember('teamId'),
  challengeController.getTeamChallenges
);
router.delete(
  '/:teamId/challenges/:challengeId',
  requireTeamLead('teamId'),
  challengeController.leaveTeamChallenge
);

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
