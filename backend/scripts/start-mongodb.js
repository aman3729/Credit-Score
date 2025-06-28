import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

async function startMongoDB() {
  try {
    // Start MongoDB in-memory server
    const mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'credit-score-dashboard-test',
        port: 27017
      }
    });
    const mongoUri = mongoServer.getUri();
    
    // Update the MONGODB_URI in process.env
    process.env.MONGODB_URI = mongoUri;
    
    console.log('MongoDB in-memory server started successfully');
    console.log('MongoDB URI:', mongoUri);
    
    // Connect to MongoDB
    // Add connection string options
    const options = new URLSearchParams({
      useNewUrlParser: 'true',
      useUnifiedTopology: 'true'
    });
    const fullUri = `${mongoUri}?${options.toString()}`;

    await mongoose.connect(fullUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 5000,
      minPoolSize: 5,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    console.log('Connected to MongoDB in-memory server');
    
    // Keep the server running
    await new Promise(() => {});
  } catch (error) {
    console.error('Error starting MongoDB:', error);
    process.exit(1);
  }
}

startMongoDB();
