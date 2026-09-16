import { Router } from 'express';
import authenticate from '../middleware/auth.middleware.js';
import * as eventController from '../controllers/event.controller.js';
import * as challengeController from '../controllers/challenge.controller.js';
import * as teamController from '../controllers/team.controller.js';

const router = Router();

// ─── Event Catalog ───────────────────────────────────────────────────────────
router.get('/', eventController.getEvents);
router.post('/', authenticate, eventController.createEvent);
router.get('/:eventId', eventController.getEventById);

// ─── Event Challenges ────────────────────────────────────────────────────────
router.get('/:eventId/challenges', challengeController.getEventChallenges);
router.post('/:eventId/challenges', authenticate, challengeController.createChallenge);

// ─── Team Registration for Event ─────────────────────────────────────────────
router.post('/:eventId/teams', authenticate, teamController.createTeamForEvent);

export default router;
