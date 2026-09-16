import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import * as evaluatorController from '../controllers/evaluator.controller.js';

const evaluatorRouter = Router();

evaluatorRouter.use(authenticate, authorizeRoles('EVALUATOR'));

evaluatorRouter.get('/dashboard', evaluatorController.getDashboard);
evaluatorRouter.get('/evaluations', evaluatorController.listEvaluations);
evaluatorRouter.get('/evaluations/:id', evaluatorController.getEvaluationById);
evaluatorRouter.patch('/evaluations/:id', evaluatorController.patchEvaluation);
evaluatorRouter.post('/evaluations/:id/submit', evaluatorController.submitEvaluation);

evaluatorRouter.get('/submissions/:submissionId/evidence/:fileName', evaluatorController.getEvidenceForEvaluation);

export default evaluatorRouter;
