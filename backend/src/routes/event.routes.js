import { Router } from 'express';
import authenticate from '../middleware/auth.middleware.js';
import * as teamController from '../controllers/team.controller.js';

const router = Router();

// Create team for event
router.post('/:eventId/teams', authenticate, teamController.createTeamForEvent);

export default router;
