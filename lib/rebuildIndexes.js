#!/usr/bin/env node

/**
 * This script rebuilds MongoDB indexes for the application.
 * Run with: node rebuildIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/avos-bot-confluence-data';

// Connect to MongoDB and rebuild indexes
async function rebuildIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Import the ConfluenceContent model with correct path
    console.log('Loading model schema...');
    
    // Setup schema manually since the import is failing
    const Schema = mongoose.Schema;
    
    const ConfluenceContentSchema = new Schema(
      {
        pageId: { type: String, required: true, unique: true },
        pageTitle: { type: String, required: true },
        pageUrl: { type: String, required: true },
        content: { type: String, required: true },
        fullHtmlContent: { type: String, default: '' },
        extractedElements: [
          {
            type: { type: String, required: true },
            name: { type: String },
            content: { type: String },
            src: { type: String },
            alt: { type: String },
          },
        ],
      },
      { timestamps: true }
    );

    // Add text indexes for search with weights to prioritize results
    ConfluenceContentSchema.index(
      { 
        pageTitle: 'text', 
        content: 'text'
      }, 
      {
        weights: {
          pageTitle: 10,  // Title is most important
          content: 5      // Content is less important
        },
        name: 'text_index'
      }
    );

    // Regular indexes for better performance on regex queries
    ConfluenceContentSchema.index({ pageTitle: 1 });
    ConfluenceContentSchema.index({ content: 1 });
    
    // Create model
    const ConfluenceContent = mongoose.model('ConfluenceContent', ConfluenceContentSchema);
    
    // Get all registered models
    const modelNames = mongoose.modelNames();
    console.log(`Found models: ${modelNames.join(', ')}`);
    
    // Drop and recreate indexes for each model
    for (const modelName of modelNames) {
      const model = mongoose.model(modelName);
      
      try {
        console.log(`Dropping indexes for ${modelName}...`);
        await model.collection.dropIndexes();
        console.log(`Creating indexes for ${modelName}...`);
        await model.createIndexes();
        
        // Show current indexes for the model
        const indexes = await model.collection.indexes();
        console.log(`Current indexes for ${modelName}:`);
        indexes.forEach(index => {
          console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
        });
      } catch (modelError) {
        console.error(`Error rebuilding indexes for ${modelName}:`, modelError);
      }
    }
    
    console.log('Index rebuild completed');
  } catch (error) {
    console.error('Failed to rebuild indexes:', error);
  } finally {
    // Close the MongoDB connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the rebuild function
rebuildIndexes()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  }); 