/**
 * Script to sanitize existing database content
 * 
 * This script:
 * 1. Connects to the MongoDB database
 * 2. Retrieves all content records
 * 3. Sanitizes them using the dbContentProcessor
 * 4. Updates the records with clean content
 * 5. Adds extractedCodeBlocks for better code search
 * 
 * Run with: npx ts-node scripts/sanitize-database.ts
 */

import connectToDatabase from '../lib/mongodb';
import ConfluenceContent from '../models/ConfluenceContent';
import { sanitizeForDatabase, extractCodeBlocks } from '../lib/dbContentProcessor';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function sanitizeDatabase() {
  console.log('Starting database sanitization...');
  
  try {
    // Connect to the database
    await connectToDatabase();
    console.log('Connected to database');
    
    // Get all content documents
    const allContent = await ConfluenceContent.find({});
    console.log(`Found ${allContent.length} documents to process`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each document
    for (let i = 0; i < allContent.length; i++) {
      const doc = allContent[i];
      const pageId = doc.pageId || 'unknown';
      
      try {
        console.log(`Processing document ${i + 1}/${allContent.length}: ${pageId}`);
        
        // Skip if no content
        if (!doc.content) {
          console.log(`- Skipping document ${pageId}: No content`);
          continue;
        }
        
        // Sanitize content
        const sanitizedContent = sanitizeForDatabase(doc.content);
        
        // Extract code blocks
        const codeBlocks = await extractCodeBlocks(doc.content);
        
        // Update the document
        await ConfluenceContent.updateOne(
          { _id: doc._id },
          { 
            $set: { 
              content: sanitizedContent,
              extractedCodeBlocks: codeBlocks,
              updatedAt: new Date(),
              isSanitized: true
            } 
          }
        );
        
        successCount++;
        if (i % 10 === 0) {
          console.log(`Progress: ${i + 1}/${allContent.length} documents processed`);
        }
      } catch (error) {
        console.error(`Error processing document ${pageId}:`, error);
        errorCount++;
      }
    }
    
    console.log('\nSanitization complete');
    console.log(`Successfully processed: ${successCount} documents`);
    console.log(`Errors encountered: ${errorCount} documents`);
    
  } catch (error) {
    console.error('Fatal error during sanitization:', error);
  } finally {
    process.exit(0);
  }
}

// Execute the sanitization
sanitizeDatabase().catch(console.error); 