import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  instructions: { type: String, default: '' },
  startDate: { type: Date, required: true },
  deadline: { type: Date, required: true },
  maxScore: { type: Number, required: true, min: 1 },
  evidenceRequirements: [{
    type: { type: String, enum: ['PHOTO', 'VIDEO', 'DOCUMENT', 'NUMBER', 'TEXT'] },
    description: String,
    required: { type: Boolean, default: false },
    minCount: { type: Number, default: 1 },
    maxCount: { type: Number, default: 1 },
  }],
  evaluationMetrics: [{
    name: String,
    description: String,
    maxScore: Number,
  }],
  impactMetrics: [{
    name: String,
    unit: String,
    required: { type: Boolean, default: false },
  }],
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'ACTIVE', 'CLOSED'],
    default: 'DRAFT',
  },
}, {
  timestamps: true,
});

taskSchema.pre('validate', function validateMaxScore(next) {
  if (!Array.isArray(this.evaluationMetrics)) {
    return next();
  }

  const totalMetricsScore = this.evaluationMetrics.reduce((sum, metric) => sum + (Number(metric.maxScore) || 0), 0);
  if (this.maxScore && totalMetricsScore !== this.maxScore) {
    this.invalidate('maxScore', 'Sum of metric.maxScore must equal task.maxScore');
  }

  next();
});

const Task = mongoose.model('Task', taskSchema);

export default Task;
