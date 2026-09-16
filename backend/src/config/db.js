const mongoose = require('mongoose');
const { mongoUri, nodeEnv } = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoUri, {
      // Mongoose 8 handles these internally, but explicit for clarity
      serverSelectionTimeoutMS: 5000,
    });
    if (nodeEnv !== 'test') {
      console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    }
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// Handle disconnection events
mongoose.connection.on('disconnected', () => {
  if (nodeEnv !== 'test') {
    console.warn('⚠️  MongoDB disconnected');
  }
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

module.exports = connectDB;
