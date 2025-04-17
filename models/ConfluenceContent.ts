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
  extractedCodeBlocks?: Array<{
    language: string;
    code: string;
  }>;
  isSanitized?: boolean;
  contentType?: string;
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
    extractedCodeBlocks: [
      {
        language: { type: String, default: '' },
        code: { type: String, required: true },
      },
    ],
    isSanitized: { type: Boolean, default: false },
    contentType: { type: String, default: 'markdown' },
    nestedLinks: [{ type: String }],
  },
  { timestamps: true }
);

// Add text indexes for search with weights to prioritize results
// Match the existing index structure from the database
ConfluenceContentSchema.index(
  { 
    pageTitle: 'text', 
    content: 'text'
    // Remove extractedCodeBlocks.code as it's not in the existing index
  }, 
  {
    weights: {
      pageTitle: 10,       // Title is most important
      content: 5           // Content is next most important
      // Remove extractedCodeBlocks.code weight to match existing index
    },
    name: 'text_index'  // Important: Use the existing index name
  }
);

// Regular indexes for better performance on regex queries
ConfluenceContentSchema.index({ pageTitle: 1 });
ConfluenceContentSchema.index({ content: 1 });
ConfluenceContentSchema.index({ 'extractedCodeBlocks.language': 1 }); // Index for code language search

// Create model if it doesn't exist already
const ConfluenceContent = mongoose.models.ConfluenceContent as Model<IConfluenceContent> || 
  mongoose.model<IConfluenceContent>('ConfluenceContent', ConfluenceContentSchema);

export default ConfluenceContent; 