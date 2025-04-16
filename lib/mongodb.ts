import mongoose from 'mongoose';

// Cache the MongoDB connection to prevent multiple connections
let cachedConnection: typeof mongoose | null = null;

// Try to get the MongoDB URI from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/avos-bot-confluence-data';

async function connectToDatabase() {
  if (cachedConnection) {
    return cachedConnection;
  }

  try {
    // Set mongoose options
    mongoose.set('strictQuery', false);
    
    // Connect to the database
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Create the text index if it doesn't exist
    await ensureIndexes();
    
    cachedConnection = mongoose;
    return mongoose;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Function to ensure all indexes are created
async function ensureIndexes() {
  try {
    // Get all model names
    const modelNames = mongoose.modelNames();
    
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