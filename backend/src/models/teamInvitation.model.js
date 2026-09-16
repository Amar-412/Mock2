import mongoose from 'mongoose';

/**
 * Team Invitation Schema.
 * Source of truth for pending invitations and student recruitment workflows.
 */
const teamInvitationSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'teams',
      required: [true, 'Team reference is required'],
      index: true,
    },
    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'Inviter reference is required'],
    },
    invitee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'Invitee reference is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    message: {
      type: String,
      maxlength: [300, 'Invitation message cannot exceed 300 characters'],
      default: '',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiration
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent multiple pending invitations for the same invitee to the same team
teamInvitationSchema.index({ team: 1, invitee: 1, status: 1 });
// Query user invitations by status
teamInvitationSchema.index({ invitee: 1, status: 1 });

const teamInvitationModel = mongoose.model('team_invitations', teamInvitationSchema);
export default teamInvitationModel;
