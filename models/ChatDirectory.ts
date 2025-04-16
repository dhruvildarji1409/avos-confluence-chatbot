import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatDirectory extends Document {
  id: string;
  name: string;
  sessionIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatDirectorySchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    sessionIds: [{ type: String }],
  },
  { timestamps: true }
);

// Create model if it doesn't exist already
const ChatDirectory = mongoose.models.ChatDirectory as Model<IChatDirectory> || 
  mongoose.model<IChatDirectory>('ChatDirectory', ChatDirectorySchema);

export default ChatDirectory; 