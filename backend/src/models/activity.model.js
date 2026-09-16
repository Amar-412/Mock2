import mongoose from 'mongoose';

/**
 * Activity Schema.
 * Records team and student milestones across competition events.
 * Extensible for future feeds, gamification, and dashboard activity streams.
 */
const activitySchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'events',
      required: [true, 'Event reference is required'],
      index: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'teams',
      default: null,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'Actor user reference is required'],
      index: true,
    },
    type: {
      type: String,
      enum: [
        'TEAM_FINALIZED',
        'CHALLENGE_JOINED',
        'SUBMISSION_CREATED',
        'SUBMISSION_SUBMITTED',
        'CHALLENGE_COMPLETED',
        'ACHIEVEMENT_EARNED',
        'MILESTONE_REACHED',
      ],
      required: [true, 'Activity type is required'],
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    visibility: {
      type: String,
      enum: ['TEAM', 'EVENT', 'PUBLIC'],
      default: 'EVENT',
      index: true,
    },
  },
  { timestamps: true }
);

// Indexes for timeline feeds
activitySchema.index({ eventId: 1, createdAt: -1 });
activitySchema.index({ teamId: 1, createdAt: -1 });

const activityModel = mongoose.model('activities', activitySchema);
export default activityModel;
