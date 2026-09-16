import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import authenticate from '../middleware/auth.middleware.js';

const authRouter = Router();

// ─── Public Endpoints ────────────────────────────────────────────────────────
authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/refresh-token', authController.refreshToken);
authRouter.post('/verify-email', authController.verifyEmail);

// ─── Protected Endpoints ──────────────────────────────────────────────────────
authRouter.get('/me', authenticate, authController.getMe);
authRouter.get('/get-me', authenticate, authController.getMe); // Compatibility alias with template
authRouter.post('/logout', authenticate, authController.logout);
authRouter.post('/logout-all', authenticate, authController.logoutAll);

export default authRouter;
