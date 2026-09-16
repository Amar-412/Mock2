import { Router } from 'express';
import authenticate from '../middleware/auth.middleware.js';
import * as userController from '../controllers/user.controller.js';

const router = Router();

// Student search (authenticated students only)
router.get('/search', authenticate, userController.searchStudents);

export default router;
