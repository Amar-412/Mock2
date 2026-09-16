import mongoose from 'mongoose';
import config from './config.js';

async function connectDB() {
  try {
    const conn = await mongoose.connect(config.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    if (config.NODE_ENV !== 'test') {
      const isAtlas = conn.connection.host.includes('mongodb.net');
      console.log(`Connected to DB Host: ${conn.connection.host} (${isAtlas ? 'MongoDB Atlas' : 'Local/Self-hosted'})`);
      console.log(`Database Name: ${conn.connection.name}`);
    }
    return conn;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
}

export default connectDB;
