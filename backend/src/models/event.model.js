import mongoose from 'mongoose';

/**
 * Event Schema.
 * Represents an Ecolympics competition/event that teams register for.
 * Controls team sizing (minTeamSize, maxTeamSize) and registration status.
 */
const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['UPCOMING', 'REGISTRATION_OPEN', 'ONGOING', 'COMPLETED'],
      default: 'REGISTRATION_OPEN',
      index: true,
    },
    registrationStartDate: {
      type: Date,
      default: Date.now,
    },
    registrationEndDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
    teamSize: {
      min: {
        type: Number,
        default: 2,
        min: 1,
      },
      max: {
        type: Number,
        default: 5,
        min: 1,
      },
    },
    collegeRestricted: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const eventModel = mongoose.model('events', eventSchema);
export default eventModel;
