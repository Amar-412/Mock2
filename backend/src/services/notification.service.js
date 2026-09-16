import notificationModel from '../models/notification.model.js';
import AppError from '../utils/AppError.js';

/**
 * Notification Service.
 * Centralized service to dispatch and manage student notifications across competition events.
 */

/**
 * Create a single notification.
 */
export const createNotification = async ({
  recipient,
  recipientId,
  sender = null,
  senderId = null,
  type,
  title,
  message,
  data = {},
}) => {
  const targetRecipient = recipient || recipientId;
  const targetSender = sender || senderId;
  try {
    return await notificationModel.create({
      recipient: targetRecipient,
      sender: targetSender,
      type,
      title,
      message,
      data,
    });
  } catch (error) {
    console.error(`⚠️ Failed to create notification (${type}):`, error.message);
    return null;
  }
};

/**
 * Create multiple notifications in bulk (e.g. for all team members).
 */
export const createBulkNotifications = async (items) => {
  if (!items) return [];
  let notifications = [];
  if (Array.isArray(items)) {
    notifications = items;
  } else if (items && items.recipients && Array.isArray(items.recipients)) {
    const { recipients, sender, senderId, type, title, message, data } = items;
    const targetSender = sender || senderId || null;
    notifications = recipients.map((r) => ({
      recipient: r,
      sender: targetSender,
      type,
      title,
      message,
      data: data || {},
    }));
  }
  if (!notifications.length) return [];
  try {
    return await notificationModel.insertMany(notifications, { ordered: false });
  } catch (error) {
    console.error('⚠️ Failed to create bulk notifications:', error.message);
    return [];
  }
};

/**
 * Retrieve paginated notifications for a specific recipient.
 */
export const getUserNotifications = async ({
  userId,
  page = 1,
  limit = 20,
  unreadOnly = false,
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const filter = { recipient: userId };
  if (unreadOnly === true || unreadOnly === 'true') {
    filter.read = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    notificationModel
      .find(filter)
      .populate('sender', 'name username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    notificationModel.countDocuments(filter),
    notificationModel.countDocuments({ recipient: userId, read: false }),
  ]);

  return {
    items: notifications,
    notifications,
    unreadCount,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Mark a single notification as read by ID (enforcing ownership).
 */
export const markAsRead = async (arg1, arg2) => {
  let notificationId;
  let userId;
  if (typeof arg1 === 'object' && arg1 !== null && arg1.notificationId) {
    notificationId = arg1.notificationId;
    userId = arg1.userId;
  } else {
    notificationId = arg1;
    userId = arg2;
  }

  const notification = await notificationModel.findById(notificationId);
  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  if (notification.recipient.toString() !== userId.toString()) {
    throw new AppError('Access denied: You cannot modify another user\'s notification', 403);
  }

  if (!notification.read) {
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
};

/**
 * Mark all unread notifications as read for a user.
 */
export const markAllAsRead = async (arg) => {
  const userId = typeof arg === 'object' && arg !== null && arg.userId ? arg.userId : arg;
  const result = await notificationModel.updateMany(
    { recipient: userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
};

export default {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
};
