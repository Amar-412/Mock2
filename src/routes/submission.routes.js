import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import Submission from '../models/submission.model.js';
import Evaluation from '../models/evaluation.model.js';
import fs from 'fs/promises';

const submissionRouter = Router();

submissionRouter.get('/admin/submissions/:submissionId/evidence/:fileId', authenticate, authorizeRoles('ADMIN'), async (req, res) => {
  const submission = await Submission.findById(req.params.submissionId);
  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

  const fileMeta = submission.evidence.find((entry) => String(entry._id || entry.filename) === String(req.params.fileId) || entry.filename === req.params.fileId || entry.path.endsWith(req.params.fileId));
  if (!fileMeta) return res.status(404).json({ success: false, message: 'Evidence file not found' });

  try {
    const data = await fs.readFile(fileMeta.path);
    res.setHeader('Content-Type', fileMeta.mimeType || 'application/octet-stream');
    return res.send(data);
  } catch (error) {
    return res.status(404).json({ success: false, message: 'Evidence file not found on disk' });
  }
});

submissionRouter.get('/evaluator/submissions/:submissionId/evidence/:fileId', authenticate, authorizeRoles('EVALUATOR'), async (req, res) => {
  const submission = await Submission.findById(req.params.submissionId);
  if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });

  const evaluation = await Evaluation.findOne({ submissionId: submission._id, evaluatorId: req.user._id });
  if (!evaluation) return res.status(403).json({ success: false, message: 'You are not assigned to this submission' });

  const fileMeta = submission.evidence.find((entry) => String(entry._id || entry.filename) === String(req.params.fileId) || entry.filename === req.params.fileId || entry.path.endsWith(req.params.fileId));
  if (!fileMeta) return res.status(404).json({ success: false, message: 'Evidence file not found' });

  try {
    const data = await fs.readFile(fileMeta.path);
    res.setHeader('Content-Type', fileMeta.mimeType || 'application/octet-stream');
    return res.send(data);
  } catch (error) {
    return res.status(404).json({ success: false, message: 'Evidence file not found on disk' });
  }
});

export default submissionRouter;
