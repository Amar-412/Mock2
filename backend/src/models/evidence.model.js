import mongoose from 'mongoose';

/**
 * Evidence Schema.
 * Stores metadata and file references for artifacts attached to a team submission.
 * Supported types: IMAGE, VIDEO, PDF, DOCUMENT, TEXT.
 * Binary payloads are persisted via the pluggable storage provider, not inside MongoDB.
 */
const evidenceSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'submissions',
      required: [true, 'Submission reference is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['IMAGE', 'VIDEO', 'PDF', 'DOCUMENT', 'TEXT'],
      required: [true, 'Evidence type is required'],
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key is required'],
    },
    url: {
      type: String,
      required: [true, 'Storage file URL is required'],
    },
    originalName: {
      type: String,
      trim: true,
      default: 'untitled',
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    size: {
      type: Number,
      required: [true, 'File size in bytes is required'],
      min: [0, 'File size must be non-negative'],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: [true, 'Uploader user reference is required'],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Indexes
evidenceSchema.index({ submissionId: 1, createdAt: 1 });
evidenceSchema.index({ submissionId: 1, type: 1 });

const evidenceModel = mongoose.model('evidence', evidenceSchema);
export default evidenceModel;
