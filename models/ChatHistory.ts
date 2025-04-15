import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IChatHistory extends Document {
  sessionId: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ChatHistorySchema: Schema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    messages: [MessageSchema],
  },
  { timestamps: true }
);

const ChatHistory = mongoose.models.ChatHistory as Model<IChatHistory> || 
  mongoose.model<IChatHistory>('ChatHistory', ChatHistorySchema);

export default ChatHistory; 