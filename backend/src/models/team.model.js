import mongoose from 'mongoose';

/**
 * Embedded Member Schema.
 * Team membership is role-scoped (LEAD | MEMBER), not a permanent global role.
 */
const memberSubSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    role: {
      type: String,
      enum: ['LEAD', 'MEMBER'],
      default: 'MEMBER',
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/**
 * Team Schema.
 * Represents a student team participating in an Ecolympics event.
 * Active members are stored directly in the embedded members array.
 */
const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: [3, 'Team name must be at least 3 characters'],
      maxlength: [50, 'Team name cannot exceed 50 characters'],
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'events',
      required: [true, 'Event reference is required'],
      index: true,
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      default: null,
    },
    joinCode: {
      type: String,
      uppercase: true,
      trim: true,
      sparse: true,
    },
    members: {
      type: [memberSubSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_APPROVAL', 'FINALIZED', 'DISBANDED'],
      default: 'DRAFT',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
// Unique team name within the same event
teamSchema.index({ eventId: 1, name: 1 }, { unique: true });
// Fast query for all teams a student is a member of
teamSchema.index({ 'members.user': 1 });
// Query by joinCode
teamSchema.index({ joinCode: 1 }, { sparse: true });

const teamModel = mongoose.model('teams', teamSchema);
export default teamModel;
