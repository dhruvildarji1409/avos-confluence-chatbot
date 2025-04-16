import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IConfluenceContent extends Document {
  pageId: string;
  pageTitle: string;
  pageUrl: string;
  content: string;
  fullHtmlContent: string;
  extractedElements: Array<{
    type: string;
    name?: string;
    content?: string;
    src?: string;
    alt?: string;
  }>;
  nestedLinks?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ConfluenceContentSchema: Schema = new Schema(
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
    nestedLinks: [{ type: String }],
  },
  { timestamps: true }
);

// Add text indexes for search with weights to prioritize results
// Use the same index name that's already in the database
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
    name: 'text_index'  // Important: Use the existing index name
  }
);

// Regular indexes for better performance on regex queries
ConfluenceContentSchema.index({ pageTitle: 1 });
ConfluenceContentSchema.index({ content: 1 });

// Create model if it doesn't exist already
const ConfluenceContent = mongoose.models.ConfluenceContent as Model<IConfluenceContent> || 
  mongoose.model<IConfluenceContent>('ConfluenceContent', ConfluenceContentSchema);

export default ConfluenceContent; 