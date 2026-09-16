import notificationService from '../services/notification.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';

/**
 * GET /api/notifications
 * Retrieve paginated notifications for the authenticated student.
 */
export const getMyNotifications = asyncHandler(async (req, res) => {
  const { page, limit, unreadOnly } = req.query;

  const result = await notificationService.getUserNotifications({
    userId: req.user._id,
    page,
    limit,
    unreadOnly,
  });

  return sendSuccess(res, {
    message: 'Notifications retrieved successfully',
    data: result,
  });
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const notification = await notificationService.markAsRead({
    notificationId: id,
    userId: req.user._id,
  });

  return sendSuccess(res, {
    message: 'Notification marked as read',
    data: { notification },
  });
});

/**
 * PATCH /api/notifications/read-all
 * Mark all unread notifications as read for the authenticated student.
 */
export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead({
    userId: req.user._id,
  });

  return sendSuccess(res, {
    message: 'All notifications marked as read',
    data: result,
  });
});

export default {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
