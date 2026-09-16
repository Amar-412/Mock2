import mongoose from 'mongoose';

/**
 * Submission Schema.
 * Represents a student team's work submitted for an Ecolympics challenge.
 * Lifecycle: DRAFT -> SUBMITTED -> UNDER_REVIEW -> EVALUATED | REJECTED.
 * Supports offline sync with idempotent `clientSubmissionId`.
 */
const submissionSchema = new mongoose.Schema(
  {
    clientSubmissionId: {
      type: String,
      trim: true,
    },
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
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'Submitter user reference is required'],
    },
    reflection: {
      type: String,
      trim: true,
      default: '',
      maxlength: [5000, 'Reflection cannot exceed 5000 characters'],
    },
    quantitativeData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'EVALUATED', 'REJECTED'],
      default: 'DRAFT',
      index: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
// Idempotency: Unique clientSubmissionId per team when provided
submissionSchema.index({ clientSubmissionId: 1 }, { unique: true, sparse: true });
// Fast lookup of team submission for a specific challenge
submissionSchema.index({ teamId: 1, challengeId: 1 });
// Query submissions by team and status
submissionSchema.index({ teamId: 1, status: 1 });

const submissionModel = mongoose.model('submissions', submissionSchema);
export default submissionModel;
