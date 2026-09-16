import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import * as studentController from '../controllers/student.controller.js';

const studentRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

studentRouter.use(authenticate, authorizeRoles('STUDENT'));

studentRouter.post('/teams', studentController.createTeam);
studentRouter.post('/teams/invite', studentController.inviteToTeam);
studentRouter.post('/invitations/:invitationId/accept', studentController.acceptInvitation);
studentRouter.post('/teams/:teamId/register', studentController.registerTeam);
studentRouter.post('/events/:eventId/tasks/:taskId/submissions', upload.array('files', 10), studentController.submitTask);
studentRouter.post('/events/:eventId/tasks/:taskId/submissions/:submissionId/evidence', upload.array('files', 10), studentController.uploadSubmissionEvidence);

export default studentRouter;
