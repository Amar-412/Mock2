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

import eventRegistrationModel from '../models/eventRegistration.model.js';
import teamModel from '../models/team.model.js';

/**
 * POST /api/events/:eventId/register
 * Register a team for an event.
 */
export const registerForEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { teamId, notes } = req.body;

  if (!teamId) {
    throw new AppError('Team ID is required to register for an event', 400);
  }

  // 1. Verify event
  const event = await eventModel.findById(eventId);
  if (!event || !event.isActive) {
    throw new AppError('Event not found or is inactive', 404);
  }

  if (event.status !== 'REGISTRATION_OPEN') {
    throw new AppError(`Event registration is closed (current status: ${event.status})`, 400);
  }

  const now = new Date();
  if (event.registrationStartDate && now < event.registrationStartDate) {
    throw new AppError('Registration has not opened yet for this event', 400);
  }
  if (event.registrationEndDate && now > event.registrationEndDate) {
    throw new AppError('Registration deadline has passed for this event', 400);
  }

  // 2. Verify team
  const team = await teamModel.findById(teamId);
  if (!team) {
    throw new AppError('Team not found', 404);
  }

  if (team.eventId.toString() !== event._id.toString()) {
    throw new AppError('This team does not belong to the specified event', 400);
  }

  if (team.status === 'DISBANDED') {
    throw new AppError('Cannot register a disbanded team', 400);
  }

  // 3. Verify user is LEAD
  const isLead = team.members.some(
    (m) => m.user.toString() === req.user._id.toString() && m.role === 'LEAD' && m.status === 'ACTIVE'
  );
  if (!isLead && req.user.role !== 'ADMIN') {
    throw new AppError('Only the team lead can register the team for this event', 403);
  }

  // 4. Check for duplicate registration
  const existingReg = await eventRegistrationModel.findOne({
    event: event._id,
    team: team._id,
    status: { $in: ['PENDING', 'CONFIRMED'] },
  });

  if (existingReg) {
    throw new AppError('This team is already registered for this event', 409);
  }

  const registration = await eventRegistrationModel.create({
    event: event._id,
    team: team._id,
    registeredBy: req.user._id,
    status: 'CONFIRMED',
    notes: notes ? notes.trim() : '',
  });

  return sendCreated(res, {
    message: 'Team successfully registered for the event',
    data: { registration },
  });
});

/**
 * GET /api/events/:eventId/registration
 * Retrieve registration status for the user's team in the specified event.
 */
export const getEventRegistration = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { teamId } = req.query;

  let queryTeamId = teamId;
  if (!queryTeamId) {
    const userTeam = await teamModel.findOne({
      eventId,
      'members.user': req.user._id,
      'members.status': 'ACTIVE',
    });
    if (userTeam) {
      queryTeamId = userTeam._id;
    }
  }

  if (!queryTeamId) {
    return sendSuccess(res, {
      message: 'No registered team found for this user in this event',
      data: { isRegistered: false, registration: null },
    });
  }

  const registration = await eventRegistrationModel
    .findOne({
      event: eventId,
      team: queryTeamId,
    })
    .populate('team', 'name status members')
    .populate('registeredBy', 'name username');

  return sendSuccess(res, {
    message: 'Event registration status retrieved successfully',
    data: {
      isRegistered: !!registration,
      registration: registration || null,
    },
  });
});

export default {
  getEvents,
  getEventById,
  createEvent,
  registerForEvent,
  getEventRegistration,
};
