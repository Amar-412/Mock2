import mongoose from 'mongoose';
import config from './config.js';

async function connectDB() {
  try {
    const conn = await mongoose.connect(config.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    if (config.NODE_ENV !== 'test') {
      console.log(`Connected to DB: ${conn.connection.host}`);
    }
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
}

export default connectDB;
