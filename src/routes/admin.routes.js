import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import * as adminController from '../controllers/admin.controller.js';

const adminRouter = Router();

adminRouter.use(authenticate, authorizeRoles('ADMIN'));

adminRouter.post('/colleges', adminController.createCollege);
adminRouter.get('/colleges', adminController.listColleges);
adminRouter.get('/colleges/:id', adminController.getCollegeById);
adminRouter.patch('/colleges/:id', adminController.updateCollege);

adminRouter.post('/events', adminController.createEvent);
adminRouter.get('/events', adminController.listEvents);
adminRouter.get('/events/:id', adminController.getEventById);
adminRouter.patch('/events/:id', adminController.updateEvent);
adminRouter.delete('/events/:id', adminController.deleteEvent);

adminRouter.post('/evaluators', adminController.createEvaluator);
adminRouter.get('/evaluators', adminController.listEvaluators);
adminRouter.get('/evaluators/:id', adminController.getEvaluatorById);
adminRouter.patch('/evaluators/:id', adminController.updateEvaluator);

adminRouter.post('/events/:eventId/evaluators', adminController.addEvaluatorToEvent);
adminRouter.get('/events/:eventId/evaluators', adminController.listEventEvaluators);
adminRouter.patch('/events/:eventId/evaluators/:evaluatorId', adminController.patchEventEvaluator);
adminRouter.delete('/events/:eventId/evaluators/:evaluatorId', adminController.removeEventEvaluator);

adminRouter.post('/events/:eventId/tasks', adminController.createTask);
adminRouter.get('/events/:eventId/tasks', adminController.listEventTasks);
adminRouter.get('/tasks/:id', adminController.getTaskById);
adminRouter.patch('/tasks/:id', adminController.updateTask);
adminRouter.delete('/tasks/:id', adminController.deleteTask);

adminRouter.get('/events/:eventId/teams', adminController.listEventTeams);
adminRouter.get('/teams/:id', adminController.getTeamById);
adminRouter.get('/events/:eventId/submissions', adminController.listEventSubmissions);
adminRouter.get('/submissions/:id', adminController.getSubmissionById);

adminRouter.get('/events/:eventId/leaderboard', adminController.getLeaderboard);
adminRouter.get('/events/:eventId/analytics', adminController.getEventAnalyticsController);
adminRouter.get('/analytics/historical', adminController.getHistoricalAnalytics);
adminRouter.get('/dashboard', adminController.getAdminDashboard);

export default adminRouter;
