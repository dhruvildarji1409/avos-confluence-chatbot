import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ChatDirectory from '@/models/ChatDirectory';
import { v4 as uuidv4 } from 'uuid';

interface Directory {
  id: string;
  name: string;
  sessionIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Get all directories
export async function GET(request: Request) {
  try {
    await connectToDatabase();
    
    // Get all directories
    const directories = await ChatDirectory.find({})
      .sort({ updatedAt: -1 })
      .lean();
    
    return NextResponse.json({ directories });
  } catch (error: any) {
    console.error('Error retrieving directories:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve directories' },
      { status: 500 }
    );
  }
}

// Create a new directory
export async function POST(request: Request) {
  try {
    const { name, sessionIds = [] } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { error: 'Directory name is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Create a new directory
    const directoryId = uuidv4();
    const newDirectory = await ChatDirectory.create({
      id: directoryId,
      name,
      sessionIds
    });
    
    return NextResponse.json(newDirectory);
  } catch (error: any) {
    console.error('Error creating directory:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create directory' },
      { status: 500 }
    );
  }
}

// Helper function to get or create the directory model
async function getDirectoryModel() {
  const mongoose = require('mongoose');
  
  // Define the schema if it doesn't exist
  if (!mongoose.models.ChatDirectory) {
    const directorySchema = new mongoose.Schema({
      id: { type: String, required: true, unique: true },
      name: { type: String, required: true },
      sessionIds: [{ type: String }],
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });
    
    // Create and return the model
    return mongoose.model('ChatDirectory', directorySchema);
  }
  
  // Return the existing model
  return mongoose.models.ChatDirectory;
} 