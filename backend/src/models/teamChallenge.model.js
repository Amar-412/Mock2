import mongoose from 'mongoose';

/**
 * TeamChallenge Schema.
 * Represents a team's participation in a specific Challenge within an Event.
 * A team can participate in multiple challenges within the same event.
 * Duplicate participation for the same team + challenge is prevented by a unique compound index.
 */
const teamChallengeSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'teams',
      required: [true, 'Team reference is required'],
      index: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'events',
      required: [true, 'Event reference is required'],
      index: true,
    },
    challengeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'challenges',
      required: [true, 'Challenge reference is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['JOINED', 'ACTIVE', 'COMPLETED', 'WITHDRAWN'],
      default: 'JOINED',
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate participation for the same team + challenge
teamChallengeSchema.index({ teamId: 1, challengeId: 1 }, { unique: true });

// Facilitate challenge-level and team-level status lookups
teamChallengeSchema.index({ eventId: 1, challengeId: 1 });
teamChallengeSchema.index({ teamId: 1, status: 1 });

const teamChallengeModel = mongoose.model('team_challenges', teamChallengeSchema);
export default teamChallengeModel;
