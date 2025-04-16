#!/usr/bin/env node

/**
 * This script rebuilds MongoDB indexes for the application.
 * Run with: node lib/rebuildIndexes.mjs
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// Initialize environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// MongoDB URI from environment or use default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/avos-bot-confluence-data';

// Connect to MongoDB and rebuild indexes
async function rebuildIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    console.log(`Using MongoDB URI: ${MONGODB_URI.replace(/:[^:]*@/, ':****@')}`); // Hide password if present
    
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Setup schema manually for ConfluenceContent
    console.log('Setting up ConfluenceContent schema...');
    
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

    // Add text indexes for search with weights
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
    const modelName = 'ConfluenceContent';
    
    // Remove existing model if it exists to avoid OverwriteModelError
    if (mongoose.models[modelName]) {
      delete mongoose.models[modelName];
    }
    
    const ConfluenceContent = mongoose.model(modelName, ConfluenceContentSchema);
    
    // Also setup ChatHistory model if needed
    const ChatHistorySchema = new Schema({
      sessionId: { type: String, required: true, unique: true },
      messages: [
        {
          role: { type: String, enum: ['user', 'assistant'], required: true },
          content: { type: String, required: true },
          timestamp: { type: Date, default: Date.now }
        }
      ]
    }, { timestamps: true });
    
    // Create ChatHistory model if not exists
    if (!mongoose.models.ChatHistory) {
      mongoose.model('ChatHistory', ChatHistorySchema);
    }
    
    // Get all registered models
    const modelNames = mongoose.modelNames();
    console.log(`Found models: ${modelNames.join(', ')}`);
    
    // Drop and recreate indexes for each model
    for (const currentModelName of modelNames) {
      const model = mongoose.model(currentModelName);
      
      try {
        console.log(`Dropping indexes for ${currentModelName}...`);
        await model.collection.dropIndexes();
        console.log(`Creating indexes for ${currentModelName}...`);
        await model.createIndexes();
        
        // Show current indexes for the model
        const indexes = await model.collection.indexes();
        console.log(`Current indexes for ${currentModelName}:`);
        indexes.forEach(index => {
          console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
        });
      } catch (modelError) {
        console.error(`Error rebuilding indexes for ${currentModelName}:`, modelError);
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