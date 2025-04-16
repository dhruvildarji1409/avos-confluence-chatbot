import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IChatHistory extends Document {
  sessionId: string;
  title: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
  sharedWith?: string[];
  shareCode?: string;
  isShared: boolean;
}

const MessageSchema = new Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ChatHistorySchema: Schema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    title: { type: String, default: 'New Chat' },
    messages: [MessageSchema],
    sharedWith: [{ type: String }],
    shareCode: { 
      type: String, 
      sparse: true, 
      index: true,
      trim: true
    },
    isShared: { type: Boolean, default: false },
  },
  { timestamps: true }
);

let ChatHistory: Model<IChatHistory>;

if (mongoose.models.ChatHistory) {
  ChatHistory = mongoose.models.ChatHistory as Model<IChatHistory>;
} else {
  ChatHistory = mongoose.model<IChatHistory>('ChatHistory', ChatHistorySchema);
}

export default ChatHistory; 