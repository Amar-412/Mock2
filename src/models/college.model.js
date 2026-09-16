import mongoose from 'mongoose';

const collegeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, trim: true, uppercase: true },
  location: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
}, {
  timestamps: true,
});

const College = mongoose.model('College', collegeSchema);

export default College;
