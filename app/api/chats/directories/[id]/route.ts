import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ChatDirectory from '@/models/ChatDirectory';

interface Params {
  params: {
    id: string
  }
}

// Get a specific directory by ID
export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = params;
    await connectToDatabase();
    
    // Find the directory by ID
    const directory = await ChatDirectory.findOne({ id }).lean();
    
    if (!directory) {
      return NextResponse.json(
        { error: 'Directory not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(directory);
  } catch (error: any) {
    console.error(`Error retrieving directory ${params.id}:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve directory' },
      { status: 500 }
    );
  }
}

// Update a directory
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = params;
    const { name, sessionIds } = await request.json();
    
    await connectToDatabase();
    
    // Update the directory
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (sessionIds !== undefined) updateData.sessionIds = sessionIds;
    
    const updatedDirectory = await ChatDirectory.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true }
    );
    
    if (!updatedDirectory) {
      return NextResponse.json(
        { error: 'Directory not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedDirectory);
  } catch (error: any) {
    console.error(`Error updating directory ${params.id}:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to update directory' },
      { status: 500 }
    );
  }
}

// Delete a directory
export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = params;
    await connectToDatabase();
    
    // Delete the directory
    const result = await ChatDirectory.deleteOne({ id });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Directory not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error deleting directory ${params.id}:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete directory' },
      { status: 500 }
    );
  }
} 