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
      enum: ['UPCOMING', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED', 'ARCHIVED'],
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
    organizer: {
      type: String,
      trim: true,
      default: 'YUWA Organization',
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    visibility: {
      type: String,
      enum: ['PUBLIC', 'COLLEGE_RESTRICTED', 'PRIVATE'],
      default: 'PUBLIC',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
eventSchema.index({ isActive: 1, status: 1 });
eventSchema.index({ isActive: 1, visibility: 1 });

const eventModel = mongoose.model('events', eventSchema);
export default eventModel;
