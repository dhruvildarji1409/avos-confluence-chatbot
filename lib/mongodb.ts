import mongoose from 'mongoose';

// Cache the MongoDB connection to prevent multiple connections
let cachedConnection: typeof mongoose | null = null;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

// Try to get the MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/avos-bot-confluence-data';

async function connectToDatabase() {
  if (cachedConnection) {
    console.log('Using cached MongoDB connection');
    return cachedConnection;
  }

  // Increment connection attempts
  connectionAttempts++;
  
  try {
    console.log(`Connecting to MongoDB at ${MONGODB_URI.split('@').pop()} (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})`);
    
    // Set mongoose options
    mongoose.set('strictQuery', false);
    
    // Connect with improved settings
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 seconds
      connectTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds for longer operations
      heartbeatFrequencyMS: 10000, // Check server health every 10 seconds
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 1, // Minimum number of connections in the pool
    });
    
    // Test the connection by querying server stats
    try {
      const db = mongoose.connection.db;
      if (db) {
        await db.admin().serverStatus();
        console.log('MongoDB connection is healthy and responsive');
      } else {
        console.warn('MongoDB connection exists but db object is undefined');
      }
    } catch (statsError) {
      console.warn('Connected to MongoDB but could not query server status:', statsError);
      // Continue anyway since the connection is established
    }
    
    console.log('Connected to MongoDB successfully');
    
    // Create the text index if it doesn't exist
    await ensureIndexes();
    
    // Reset connection attempts on successful connection
    connectionAttempts = 0;
    
    cachedConnection = mongoose;
    return mongoose;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    // If we've exhausted our connection attempts, throw the error
    if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
      connectionAttempts = 0; // Reset for next time
      console.error(`Failed to connect to MongoDB after ${MAX_CONNECTION_ATTEMPTS} attempts.`);
      console.error('MongoDB connection failed. Check that MongoDB is running and accessible.');
      throw new Error(`Failed to connect to MongoDB: ${(error as Error).message}`);
    }
    
    // If we still have attempts left, return null to allow caller to handle retry
    console.warn(`MongoDB connection attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS} failed. Will retry on next request.`);
    // Do not throw - allow caller to handle the retry logic
    return null;
  }
}

// Function to ensure all indexes are created
async function ensureIndexes() {
  try {
    // Get all model names
    const modelNames = mongoose.modelNames();
    console.log(`Creating indexes for models: ${modelNames.join(', ')}`);
    
    // For each model, ensure its indexes
    for (const modelName of modelNames) {
      const model = mongoose.model(modelName);
      await model.createIndexes();
      console.log(`Indexes for ${modelName} have been built/verified`);
    }
  } catch (indexError) {
    console.error('Error creating indexes:', indexError);
    // Don't throw the error - just log it
    // This way the application can still function even if indexes fail
  }
}

export default connectToDatabase; 