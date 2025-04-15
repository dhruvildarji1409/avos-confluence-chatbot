import axios from 'axios';
import * as cheerio from 'cheerio';
import ConfluenceContent from '../models/ConfluenceContent';
import connectToDatabase from './mongodb';

interface ExtractedElement {
  type: string;
  name?: string;
  content?: string;
  src?: string;
  alt?: string;
}

export interface ParsedConfluenceData {
  pageId: string;
  pageTitle: string;
  pageUrl: string;
  content: string;
  extractedElements: ExtractedElement[];
}

export async function parseConfluencePage(pageUrl: string): Promise<ParsedConfluenceData> {
  // Connect to database
  await connectToDatabase();
  
  // Check if page is already parsed and stored
  const existingPage = await ConfluenceContent.findOne({ pageUrl });
  if (existingPage) {
    return {
      pageId: existingPage.pageId,
      pageTitle: existingPage.pageTitle,
      pageUrl: existingPage.pageUrl,
      content: existingPage.content,
      extractedElements: existingPage.extractedElements
    };
  }
  
  // If environment variables for authentication are not set, throw an error
  if (!process.env.CONFLUENCE_USERNAME || !process.env.CONFLUENCE_PASSWORD || !process.env.CONFLUENCE_BASE_URL) {
    throw new Error('Confluence credentials not found in environment variables');
  }

  const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL;
  const USERNAME = process.env.CONFLUENCE_USERNAME;
  const PASSWORD = process.env.CONFLUENCE_PASSWORD;

  // Create auth header for Confluence (basic auth)
  const auth = {
    username: USERNAME,
    password: PASSWORD
  };

  try {
    // Extract page ID from URL
    let pageId: string | null = null;
    
    // Method 1: Try to extract pageId directly from URL
    const pageIdMatch = pageUrl.match(/pageId=(\d+)/);
    if (pageIdMatch) {
      pageId = pageIdMatch[1];
    }
    
    // Method 2: Try to extract spaceKey and title from URL
    if (!pageId) {
      const spaceKeyMatch = pageUrl.match(/spaceKey=([^&]+)/);
      const titleMatch = pageUrl.match(/title=([^&]+)/);
      
      if (spaceKeyMatch && titleMatch) {
        const spaceKey = decodeURIComponent(spaceKeyMatch[1]);
        const title = decodeURIComponent(titleMatch[1]);
        
        const lookupUrl = `${CONFLUENCE_BASE_URL}?spaceKey=${spaceKey}&title=${title}&expand=body.storage`;
        const response = await axios.get(lookupUrl, { auth });
        
        const results = response.data.results || [];
        if (results.length > 0) {
          pageId = results[0].id;
        }
      }
    }
    
    // Method 3: Try to extract from /display/SPACE/TITLE format
    if (!pageId) {
      const displayMatch = pageUrl.match(/\/display\/([^/]+)\/(.+)/);
      if (displayMatch) {
        const spaceKey = decodeURIComponent(displayMatch[1]);
        const pageTitle = decodeURIComponent(displayMatch[2]);
        
        const lookupUrl = `${CONFLUENCE_BASE_URL}?spaceKey=${spaceKey}&title=${pageTitle}&expand=body.storage`;
        const response = await axios.get(lookupUrl, { auth });
        
        const results = response.data.results || [];
        if (results.length > 0) {
          pageId = results[0].id;
        }
      }
    }
    
    // Method 4: Last resort, try to get page_id from page headers
    if (!pageId) {
      const response = await axios.get(pageUrl, { 
        auth,
        maxRedirects: 5
      });
      
      pageId = response.headers['x-confluence-pageid'];
    }
    
    // If we still don't have a page_id, give up
    if (!pageId) {
      throw new Error('Could not determine page ID from URL');
    }

    // Now that we have the page_id, get the content
    const contentUrl = `${CONFLUENCE_BASE_URL}/${pageId}?expand=body.storage`;
    const contentResponse = await axios.get(contentUrl, { auth });
    
    const data = contentResponse.data;
    const html = data.body?.storage?.value;
    
    if (!html) {
      throw new Error('No content found in the page');
    }
    
    // Extract content with Cheerio (Node.js version of BeautifulSoup)
    const $ = cheerio.load(html);
    const extractedElements: ExtractedElement[] = [];
    
    // Extract structured macros (like UML, code blocks, etc.)
    $('ac\\:structured-macro').each((_, element) => {
      const macroType = $(element).attr('ac:name') || '';
      const content = $(element).text().trim();
      
      extractedElements.push({
        type: 'macro',
        name: macroType,
        content: content
      });
    });
    
    // Extract code blocks
    $('pre, code').each((_, element) => {
      extractedElements.push({
        type: 'code',
        content: $(element).text().trim()
      });
    });
    
    // Extract images
    $('img').each((_, element) => {
      extractedElements.push({
        type: 'image',
        src: $(element).attr('src'),
        alt: $(element).attr('alt') || ''
      });
    });
    
    // Get the full text content
    const fullText = $('body').text().trim();
    
    // Prepare the data
    const parsedData: ParsedConfluenceData = {
      pageId,
      pageTitle: $('title').text() || 'Unknown',
      pageUrl,
      content: fullText,
      extractedElements: extractedElements.slice(0, 15) // Limit to 15 elements
    };
    
    // Store the data in MongoDB
    await ConfluenceContent.create(parsedData);
    
    return parsedData;
  } catch (error) {
    console.error('Failed to parse Confluence page:', error);
    throw new Error(`Failed to parse Confluence page: ${(error as Error).message}`);
  }
}

export async function searchConfluenceContent(query: string): Promise<any[]> {
  await connectToDatabase();
  
  // Perform text search in the database
  const results = await ConfluenceContent.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(5)
    .lean()
    .exec();
  
  return results;
} 