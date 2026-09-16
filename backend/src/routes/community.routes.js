import { Router } from 'express';
import authenticate from '../middleware/auth.middleware.js';
import * as communityController from '../controllers/community.controller.js';

const router = Router();

// All community routes require authentication
router.use(authenticate);

router.get('/feed', communityController.getCommunityFeed);

export default router;
