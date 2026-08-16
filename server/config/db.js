import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.warn('[Database Warning] MONGODB_URI not configured. Running with in-memory cache mode.');
    isConnected = false;
    return false;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    isConnected = true;

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database Warning] MongoDB disconnected. Falling back to in-memory cache mode.');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[Database] MongoDB reconnected.');
      isConnected = true;
    });

    return true;
  } catch (error) {
    console.warn(`[Database Warning] MongoDB connection failed (${error.message}). Running with in-memory cache mode.`);
    isConnected = false;
    return false;
  }
};

export const getIsMongoConnected = () => isConnected;

