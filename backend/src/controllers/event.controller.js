import eventModel from '../models/event.model.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/apiResponse.js';

/**
 * GET /api/events
 * Retrieve list of active competition events.
 * Query filters: status, visibility, page, limit.
 */
export const getEvents = asyncHandler(async (req, res) => {
  const { status, visibility, page = 1, limit = 20 } = req.query;

  const filter = { isActive: true };
  if (status) {
    filter.status = status;
  }
  if (visibility) {
    filter.visibility = visibility;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [events, total] = await Promise.all([
    eventModel.find(filter).sort({ startDate: 1, createdAt: -1 }).skip(skip).limit(limitNum),
    eventModel.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    message: 'Events retrieved successfully',
    data: {
      events,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
});

/**
 * GET /api/events/:eventId
 * Retrieve detailed event information by ID.
 */
export const getEventById = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const event = await eventModel.findById(eventId);
  if (!event || !event.isActive) {
    throw new AppError('Event not found or is no longer active', 404);
  }

  return sendSuccess(res, {
    message: 'Event retrieved successfully',
    data: { event },
  });
});

/**
 * POST /api/events
 * Create a new event (organizer/admin endpoint).
 */
export const createEvent = asyncHandler(async (req, res) => {
  const {
    title,
    slug,
    description,
    status = 'REGISTRATION_OPEN',
    registrationStartDate,
    registrationEndDate,
    startDate,
    endDate,
    teamSize,
    organizer,
    visibility = 'PUBLIC',
    collegeRestricted = false,
  } = req.body;

  if (!title) {
    throw new AppError('Event title is required', 400);
  }

  const generatedSlug = (slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) +
    `-${Date.now().toString(36)}`;

  const event = await eventModel.create({
    title,
    slug: generatedSlug,
    description,
    status,
    registrationStartDate: registrationStartDate || Date.now(),
    registrationEndDate: registrationEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    startDate,
    endDate,
    teamSize: teamSize || { min: 2, max: 5 },
    organizer: organizer || 'YUWA Organization',
    visibility,
    collegeRestricted,
    isActive: true,
  });

  return sendCreated(res, {
    message: 'Event created successfully',
    data: { event },
  });
});

export default {
  getEvents,
  getEventById,
  createEvent,
};
