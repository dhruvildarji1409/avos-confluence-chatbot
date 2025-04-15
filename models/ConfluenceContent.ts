import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IConfluenceContent extends Document {
  pageId: string;
  pageTitle: string;
  pageUrl: string;
  content: string;
  extractedElements: Array<{
    type: string;
    name?: string;
    content?: string;
    src?: string;
    alt?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ConfluenceContentSchema: Schema = new Schema(
  {
    pageId: { type: String, required: true, unique: true },
    pageTitle: { type: String, required: true },
    pageUrl: { type: String, required: true },
    content: { type: String, required: true },
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

// Add text indexes for search
ConfluenceContentSchema.index({ pageTitle: 'text', content: 'text' });

const ConfluenceContent = mongoose.models.ConfluenceContent as Model<IConfluenceContent> || 
  mongoose.model<IConfluenceContent>('ConfluenceContent', ConfluenceContentSchema);

export default ConfluenceContent; 