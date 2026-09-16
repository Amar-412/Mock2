import { Router } from 'express';
import authenticate from '../middleware/auth.middleware.js';
import * as invitationController from '../controllers/invitation.controller.js';

const router = Router();

// All invitation routes require an authenticated user
router.use(authenticate);

router.get('/', invitationController.getMyInvitations);
router.post('/:id/accept', invitationController.acceptInvitation);
router.post('/:id/reject', invitationController.rejectInvitation);

export default router;
