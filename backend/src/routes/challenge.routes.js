import { Router } from 'express';
import authenticate from '../middleware/auth.middleware.js';
import * as challengeController from '../controllers/challenge.controller.js';

const router = Router();

// Retrieve challenge details (accessible publicly or authenticated)
router.get('/:challengeId', challengeController.getChallengeById);

export default router;
