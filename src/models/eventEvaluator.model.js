import mongoose from 'mongoose';

const eventEvaluatorSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  evaluatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
  isActive: { type: Boolean, default: true },
  assignedCount: { type: Number, default: 0 },
  completedCount: { type: Number, default: 0 },
  pendingCount: { type: Number, default: 0 },
}, {
  timestamps: true,
});

eventEvaluatorSchema.index({ eventId: 1, evaluatorId: 1 }, { unique: true });

const EventEvaluator = mongoose.model('EventEvaluator', eventEvaluatorSchema);

export default EventEvaluator;
