import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | null = null;

export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/realtime_chat';
    console.log(`Attempting to connect to MongoDB at ${mongoURI}...`);
    
    // timeout so we fallback quickly if local mongo isn't running
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 2000 });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.warn('Standard MongoDB connection failed. Falling back to mongodb-memory-server for testing...');
    
    try {
      if (mongoServer) {
        try { await mongoServer.stop(); } catch (e) {}
      }
      mongoServer = await MongoMemoryServer.create();
      const memoryUri = mongoServer.getUri();
      
      await mongoose.connect(memoryUri);
      console.log(`Connected to in-memory MongoDB at ${memoryUri}`);
    } catch (memError) {
      console.error('Failed to start in-memory MongoDB:', memError);
      process.exit(1);
    }
  }
};

process.on('SIGINT', async () => {
  if (mongoServer) await mongoServer.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (mongoServer) await mongoServer.stop();
  process.exit(0);
});
