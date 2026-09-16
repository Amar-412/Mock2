import mongoose from 'mongoose';

const evidenceEntrySchema = new mongoose.Schema({
  type: { type: String },
  path: { type: String },
  filename: { type: String },
  mimeType: { type: String },
  size: { type: Number },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  evidence: [evidenceEntrySchema],
  metrics: [{
    name: String,
    value: Number,
    unit: String,
  }],
  reflection: { type: String, default: '' },
  status: {
    type: String,
    enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED'],
    default: 'DRAFT',
  },
  version: { type: Number, default: 1 },
  submittedAt: { type: Date },
}, {
  timestamps: true,
});

submissionSchema.index({ eventId: 1, teamId: 1 });
submissionSchema.index({ taskId: 1, status: 1 });

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;
