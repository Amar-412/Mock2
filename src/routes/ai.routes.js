import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import * as aiController from '../controllers/ai.controller.js';

const aiRouter = Router();

// Protect all AI routes with existing authentication middleware
aiRouter.use(authenticate);

aiRouter.post('/chat', aiController.chat);

export default aiRouter;
