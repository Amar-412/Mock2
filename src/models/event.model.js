import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  participatingColleges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'College' }],
  eventDocument: {
    path: String,
    filename: String,
    mimeType: String,
  },
  teamConfig: {
    minMembers: { type: Number, default: 1 },
    maxMembers: { type: Number, default: 5 },
  },
  evaluatorConfig: {
    maxPendingAssignments: { type: Number, default: 3 },
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'ARCHIVED'],
    default: 'DRAFT',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
}, {
  timestamps: true,
});

eventSchema.index({ startDate: 1, endDate: 1 });

const Event = mongoose.model('Event', eventSchema);

export default Event;
