import mongoose from 'mongoose';
import '../config/polyfill.js';

/**
 * EventRegistration Schema.
 * Represents a team's formal registration for an event.
 * Ensures single active registration per team per event.
 */
const eventRegistrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'events',
      required: [true, 'Event reference is required'],
      index: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'teams',
      required: [true, 'Team reference is required'],
      index: true,
    },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'Registering user reference is required'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED'],
      default: 'CONFIRMED',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Prevent duplicate registrations for the same team in the same event
eventRegistrationSchema.index({ event: 1, team: 1 }, { unique: true });

const eventRegistrationModel = mongoose.model('event_registrations', eventRegistrationSchema);
export default eventRegistrationModel;
