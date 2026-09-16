import mongoose from 'mongoose';

/**
 * Challenge Schema.
 * Represents a specific challenge or competition track within an Event.
 * Supports configurable tracks (e.g. Waste, Energy, Water, Climate Action)
 * with custom quantitative metrics and evidence submission requirements.
 */
const challengeSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'events',
      required: [true, 'Event reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Challenge title is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Challenge slug is required'],
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    track: {
      type: String,
      required: [true, 'Challenge track/category is required'],
      trim: true,
      index: true,
    },
    instructions: {
      type: String,
      default: '',
    },
    submissionRequirements: {
      minEvidenceCount: {
        type: Number,
        default: 1,
        min: [0, 'Minimum evidence count cannot be negative'],
      },
      allowedEvidenceTypes: {
        type: [String],
        enum: ['IMAGE', 'VIDEO', 'PDF', 'DOCUMENT', 'TEXT'],
        default: ['IMAGE', 'VIDEO', 'PDF', 'DOCUMENT', 'TEXT'],
      },
    },
    quantitativeFields: [
      {
        key: {
          type: String,
          required: true,
          trim: true,
        },
        label: {
          type: String,
          required: true,
          trim: true,
        },
        unit: {
          type: String,
          default: '',
          trim: true,
        },
        required: {
          type: Boolean,
          default: false,
        },
      },
    ],
    startAt: {
      type: Date,
      default: null,
    },
    endAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ACTIVE', 'CLOSED', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
    maxTeams: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound indexes
challengeSchema.index({ eventId: 1, slug: 1 }, { unique: true });
challengeSchema.index({ eventId: 1, track: 1 });
challengeSchema.index({ eventId: 1, status: 1 });

const challengeModel = mongoose.model('challenges', challengeSchema);
export default challengeModel;
