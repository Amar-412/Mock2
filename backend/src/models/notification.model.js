import mongoose from 'mongoose';

/**
 * Minimal Notification Model Foundation.
 * Supports team invitation notifications without full notification infrastructure.
 */
const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      default: null,
    },
    type: {
      type: String,
      enum: [
        'TEAM_INVITATION',
        'INVITATION_ACCEPTED',
        'INVITATION_REJECTED',
        'TEAM_FINALIZED',
        'LEAD_REASSIGNED',
        'CHALLENGE_JOINED',
        'SUBMISSION_SUBMITTED',
        'TEAM_DISBANDED',
        'SYSTEM',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

const notificationModel = mongoose.model('notifications', notificationSchema);
export default notificationModel;
