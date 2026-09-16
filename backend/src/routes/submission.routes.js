import { Router } from 'express';
import authenticate from '../middleware/auth.middleware.js';
import { uploadSingle } from '../middleware/upload.middleware.js';
import * as submissionController from '../controllers/submission.controller.js';

const router = Router();

// All submission operations require authentication
router.use(authenticate);

// ─── Core Submission Operations ──────────────────────────────────────────────
router.post('/', submissionController.createSubmission);
router.post('/sync', submissionController.syncSubmission);
router.get('/:id', submissionController.getSubmissionById);

// ─── Evidence & Lifecycle Operations ─────────────────────────────────────────
router.post('/:submissionId/evidence', uploadSingle, submissionController.uploadEvidence);
router.post('/:submissionId/submit', submissionController.submitSubmission);

export default router;
