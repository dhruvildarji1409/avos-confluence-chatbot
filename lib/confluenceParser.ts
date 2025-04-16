import axios from 'axios';
import * as cheerio from 'cheerio';
import ConfluenceContent from '../models/ConfluenceContent';
import connectToDatabase from './mongodb';
import { prepareForDatabaseInsertion, sanitizeForDatabase, extractCodeBlocks } from './dbContentProcessor';

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
  fullHtmlContent: string;
  extractedElements: ExtractedElement[];
  extractedCodeBlocks?: Array<{language: string, code: string}>;
  isSanitized?: boolean;
  contentType?: string;
  nestedLinks?: string[];
}

export async function parseConfluencePage(
  pageUrl: string, 
  depth: number = 0, 
  maxDepth: number = 3,
  visitedUrls: Set<string> = new Set()
): Promise<ParsedConfluenceData> {
  // Connect to database
  await connectToDatabase();
  
  // Prevent infinite recursion by checking if we've already visited this URL
  if (visitedUrls.has(pageUrl)) {
    console.log(`Already visited ${pageUrl}, skipping to prevent infinite recursion`);
    return {
      pageId: Buffer.from(pageUrl).toString('base64'),
      pageTitle: "Previously Visited Page",
      pageUrl: pageUrl,
      content: "This page was already processed in the current parsing chain.",
      fullHtmlContent: "",
      extractedElements: []
    };
  }

  // Add current URL to visited set
  visitedUrls.add(pageUrl);
  
  // Check if page is already parsed and stored
  const existingPage = await ConfluenceContent.findOne({ pageUrl });
  if (existingPage) {
    // Even for existing pages, we want to extract nested links for recursion
    const nestedLinks = existingPage.nestedLinks || [];

    // If we're at max depth, return without recursively parsing nested links
    if (depth >= maxDepth) {
      return {
        pageId: existingPage.pageId,
        pageTitle: existingPage.pageTitle,
        pageUrl: existingPage.pageUrl,
        content: existingPage.content,
        fullHtmlContent: existingPage.fullHtmlContent,
        extractedElements: existingPage.extractedElements,
        nestedLinks
      };
    }

    // If we're not at max depth and we have nested links, recursively parse them
    if (depth < maxDepth && nestedLinks.length > 0) {
      console.log(`Found ${nestedLinks.length} nested links in existing page at depth ${depth}`);
      
      // Recursively parse nested links
      for (const nestedLink of nestedLinks) {
        if (!visitedUrls.has(nestedLink)) {
          console.log(`Recursively parsing nested link at depth ${depth + 1}: ${nestedLink}`);
          await parseConfluencePage(nestedLink, depth + 1, maxDepth, visitedUrls);
        }
      }
    }

    return {
      pageId: existingPage.pageId,
      pageTitle: existingPage.pageTitle,
      pageUrl: existingPage.pageUrl,
      content: existingPage.content,
      fullHtmlContent: existingPage.fullHtmlContent,
      extractedElements: existingPage.extractedElements,
      nestedLinks
    };
  }

  try {
    console.log(`Attempting to fetch page: ${pageUrl}`);

    // Extract page ID from URL if available
    let pageId = "";
    const pageIdMatch = pageUrl.match(/pageId=(\d+)/);
    if (pageIdMatch) {
      pageId = pageIdMatch[1];
      console.log(`Found pageId in URL: ${pageId}`);
    }
    
    // If no pageId, try to extract from display URL format
    let spaceKey = '';
    let pageTitle = 'Unknown Page';
    
    // Check for display format: /display/SPACE/PAGE+TITLE
    const displayMatch = pageUrl.match(/\/display\/([^/]+)\/(.+)/);
    if (displayMatch && !pageId) {
      spaceKey = displayMatch[1];
      pageTitle = displayMatch[2].replace(/\+/g, ' ');
      console.log(`Found display format URL: Space=${spaceKey}, Title=${pageTitle}`);
    } else {
      // Extract from viewpage.action URL if not display format
      const spaceKeyMatch = pageUrl.match(/spaceKey=([^&]+)/);
      if (spaceKeyMatch) {
        spaceKey = decodeURIComponent(spaceKeyMatch[1]);
        console.log(`Found spaceKey in URL: ${spaceKey}`);
      }

      const titleMatch = pageUrl.match(/title=([^&]+)/);
      if (titleMatch) {
        pageTitle = decodeURIComponent(titleMatch[1]).replace(/\+/g, ' ');
        console.log(`Found title in URL: ${pageTitle}`);
      }
    }
    
    // If no pageId, generate one from the URL
    if (!pageId) {
      pageId = Buffer.from(pageUrl).toString('base64');
    }
    
    // Log the credentials being used (without revealing sensitive values)
    console.log('Using authentication:');
    console.log(`- Username present: ${Boolean(process.env.CONFLUENCE_USERNAME)}`);
    console.log(`- Password present: ${Boolean(process.env.CONFLUENCE_PASSWORD)}`);
    console.log(`- API token present: ${Boolean(process.env.CONFLUENCE_API_TOKEN)}`);
    
    // Try to fetch using API token
    let detailedContent = '';
    let pageContent = ''; // Single variable for page content
    let extractedElements: ExtractedElement[] = [];
    let nestedLinks: string[] = [];
    
    try {
      // Build API URL based on available parameters
      let apiUrl = '';
      
      if (spaceKey && pageTitle) {
        // Format: rest/api/content?spaceKey=SPACE&title=TITLE&expand=body.storage
        apiUrl = `${process.env.CONFLUENCE_BASE_URL}rest/api/content?spaceKey=${encodeURIComponent(spaceKey)}&title=${encodeURIComponent(pageTitle)}&expand=body.storage`;
        console.log(`Using API URL: ${apiUrl}`);
        
        // Prepare both authentication methods
        const username = process.env.CONFLUENCE_USERNAME || '';
        const password = process.env.CONFLUENCE_PASSWORD || '';
        const token = process.env.CONFLUENCE_API_TOKEN || '';
        
        // Create basic auth header
        const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
        
        // Try API token first
        try {
          console.log(`Attempting API token authentication...`);
          const response = await axios.get(apiUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            },
            validateStatus: (status) => status < 400, // Only treat HTTP errors as errors
            maxRedirects: 0, // Prevent redirects to login pages
            timeout: 10000 // 10 second timeout
          });
          
          console.log(`API token authentication successful`);
          console.log(`API response status: ${response.status}`);
          
          // Check if the response is JSON (prevent HTML parsing errors)
          const contentType = response.headers['content-type'];
          if (!contentType || !contentType.includes('application/json')) {
            console.error(`Expected JSON response but got ${contentType}`);
            console.error(`Response data preview: ${typeof response.data === 'string' ? response.data.substring(0, 100) : 'Not a string'}`);
            throw new Error(`Expected JSON response but received ${contentType || 'unknown content type'}`);
          }
          
          if (response.data && response.data.results && response.data.results.length > 0) {
            const page = response.data.results[0];
            console.log(`Found page: ID=${page.id}, Title=${page.title}`);
            
            if (page.body && page.body.storage && page.body.storage.value) {
              // Set detailed content and page details
              detailedContent = page.body.storage.value;
              pageId = page.id;
              pageTitle = page.title;
              
              // Parse content with Cheerio for extracting elements
              const $ = cheerio.load(detailedContent);
              
              // Store the entire body content (this ensures we don't miss anything)
              pageContent = $('body').html() || detailedContent;
              
              // Extract elements for structured access
              extractElementsFromHtml(detailedContent, extractedElements);
              
              // Extract nested Confluence links
              nestedLinks = extractConfluenceLinks($, process.env.CONFLUENCE_BASE_URL as string);
              
              console.log(`Extracted complete page content with ${extractedElements.length} structured elements and ${nestedLinks.length} nested Confluence links`);
            }
          }
        } catch (tokenError: any) {
          console.warn(`API token authentication failed: ${tokenError.message}`);
          console.warn('Response details:', tokenError.response ? {
            status: tokenError.response.status,
            statusText: tokenError.response.statusText,
            headers: tokenError.response.headers,
            contentType: tokenError.response.headers['content-type']
          } : 'No response details available');
          
          // Fall back to basic auth
          try {
            console.log(`Attempting basic auth authentication...`);
            const response = await axios.get(apiUrl, {
              headers: {
                'Authorization': `Basic ${basicAuth}`,
                'Accept': 'application/json'
              },
              validateStatus: (status) => status < 400,
              maxRedirects: 0,
              timeout: 10000 // 10 second timeout
            });
            
            console.log(`Basic auth authentication successful`);
            console.log(`API response status: ${response.status}`);
            
            // Check if the response is JSON
            const contentType = response.headers['content-type'];
            if (!contentType || !contentType.includes('application/json')) {
              throw new Error(`Expected JSON response but received ${contentType || 'unknown content type'}`);
            }
            
            if (response.data && response.data.results && response.data.results.length > 0) {
              const page = response.data.results[0];
              console.log(`Found page: ID=${page.id}, Title=${page.title}`);
              
              if (page.body && page.body.storage && page.body.storage.value) {
                // Set detailed content and page details
                detailedContent = page.body.storage.value;
                pageId = page.id;
                pageTitle = page.title;
                
                // Parse content with Cheerio for extracting elements
                const $ = cheerio.load(detailedContent);
                
                // Store the entire body content (this ensures we don't miss anything)
                pageContent = $('body').html() || detailedContent;
                
                // Extract elements for structured access
                extractElementsFromHtml(detailedContent, extractedElements);
                
                // Extract nested Confluence links
                nestedLinks = extractConfluenceLinks($, process.env.CONFLUENCE_BASE_URL as string);
                
                console.log(`Extracted complete page content with ${extractedElements.length} structured elements and ${nestedLinks.length} nested Confluence links`);
              }
            }
          } catch (basicAuthError: any) {
            console.warn(`Basic auth authentication failed: ${basicAuthError.message}`);
            console.warn('Response details:', basicAuthError.response ? {
              status: basicAuthError.response.status,
              statusText: basicAuthError.response.statusText,
              headers: basicAuthError.response.headers,
              contentType: basicAuthError.response.headers['content-type']
            } : 'No response details available');
            
            // Third fallback - try direct page fetch with axios (useful when API has issues but direct access works)
            try {
              console.log(`Attempting direct page access to ${pageUrl}...`);
              
              const directResponse = await axios.get(pageUrl, {
                headers: {
                  // Try with cookie auth if available 
                  'Cookie': process.env.CONFLUENCE_COOKIES || '',
                  'Accept': 'text/html,application/xhtml+xml'
                },
                maxRedirects: 5, // Allow some redirects for cookie-based auth
                timeout: 15000,
                validateStatus: (status) => status < 400
              });
              
              console.log(`Direct page access successful, status: ${directResponse.status}`);
              
              if (directResponse.data && typeof directResponse.data === 'string') {
                // Use cheerio to parse the HTML content
                const $ = cheerio.load(directResponse.data);
                
                // Extract the page title
                pageTitle = $('#title-text').text().trim() || pageTitle;
                
                // Get the main content
                const mainContent = $('#main-content').html() || '';
                
                // Set content variables
                detailedContent = mainContent;
                pageContent = mainContent;
                
                // Extract elements from the HTML
                extractElementsFromHtml(mainContent, extractedElements);
                
                // Extract links
                nestedLinks = extractConfluenceLinks($, process.env.CONFLUENCE_BASE_URL as string);
                
                console.log(`Extracted page content directly: ${pageTitle} with ${extractedElements.length} elements`);
              } else {
                throw new Error('Direct page access returned invalid data format');
              }
            } catch (directAccessError: any) {
              console.error('All authentication methods failed, including direct access:', directAccessError.message);
              // Continue with placeholder approach below
            }
          }
        }
      }
    } catch (error: any) {
      console.warn('Could not fetch page content via API:', error.message);
      if (error.response) {
        console.warn(`Response status: ${error.response.status}`);
        console.warn(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      // Continue with fallback approach
    }
    
    // Build content - use API content if available, otherwise fallback
    if (!pageContent) {
      pageContent = `
        This content was manually indexed from: ${pageUrl}
        
        Space Key: ${spaceKey}
        Page Title: ${pageTitle}
        
        To access the complete content, please visit the Confluence page directly.
        
        Note: Direct content scraping was not possible due to Confluence authentication requirements.
      `.trim();
    }
    
    // Prepare the data
    const parsedData: ParsedConfluenceData = {
      pageId,
      pageTitle,
      pageUrl,
      content: pageContent,
      fullHtmlContent: detailedContent || '',
      extractedElements: extractedElements.length > 0 ? extractedElements : [],
      extractedCodeBlocks: extractCodeBlocks(pageContent),
      isSanitized: true,
      contentType: 'markdown',
      nestedLinks
    };
    
    console.log(`Sanitizing and saving to database: pageId=${pageId}, title=${pageTitle}`);
    
    // Sanitize content before storage
    parsedData.content = sanitizeForDatabase(pageContent);
    
    // Store the data in MongoDB
    try {
      await ConfluenceContent.create(parsedData);
      console.log(`Successfully saved to database`);
    } catch (error: any) {
      console.error('Database error:', error);
      // If there's a validation error about empty content, set a placeholder
      if (error.message && error.message.includes('content')) {
        console.log('Content validation error, using placeholder');
        parsedData.content = sanitizeForDatabase(`Placeholder content for ${pageTitle} - ${new Date().toISOString()}`);
        await ConfluenceContent.create(parsedData);
      } else {
        throw error; // Re-throw if it's not a content validation error
      }
    }

    // Recursively fetch nested Confluence links if not at max depth
    if (depth < maxDepth && nestedLinks.length > 0) {
      console.log(`Found ${nestedLinks.length} nested links at depth ${depth}, recursively parsing...`);
      
      // Recursively parse nested links
      for (const nestedLink of nestedLinks) {
        if (!visitedUrls.has(nestedLink)) {
          console.log(`Recursively parsing nested link at depth ${depth + 1}: ${nestedLink}`);
          await parseConfluencePage(nestedLink, depth + 1, maxDepth, visitedUrls);
        }
      }
    }
    
    return parsedData;
  } catch (error) {
    console.error('Failed to parse Confluence page:', error);
    throw new Error(`Failed to parse Confluence page: ${(error as Error).message}`);
  }
}

// New helper function to extract Confluence links from HTML
function extractConfluenceLinks($: any, baseUrl: string): string[] {
  const links = new Set<string>();
  
  // Find all links in the page
  $('a').each((i: number, el: any) => {
    const href = $(el).attr('href');
    
    if (href) {
      // Check if the link is a Confluence link
      const isConfluenceLink = href.includes('confluence.') || 
                              href.includes('/display/') || 
                              href.includes('/pages/') ||
                              href.includes('viewpage.action') ||
                              (baseUrl && href.startsWith(baseUrl));
      
      if (isConfluenceLink) {
        // Handle relative URLs
        let fullUrl = href;
        if (href.startsWith('/')) {
          // Convert relative URL to absolute using the base URL
          fullUrl = baseUrl ? baseUrl.replace(/\/$/, '') + href : href;
        }
        
        links.add(fullUrl);
      }
    }
  });
  
  return Array.from(links);
}

// Helper function to extract elements from HTML
function extractElementsFromHtml(html: string, extractedElements: ExtractedElement[]) {
  const $ = cheerio.load(html);
  
  // Extract all content blocks from the page
  $('body > *').each((i, el) => {
    const $el = $(el);
    const tagName = $el.prop('tagName').toLowerCase();
    const className = $el.attr('class') || '';
    const id = $el.attr('id') || '';
    const text = $el.text().trim();
    
    // Skip empty elements
    if (!text) return;
    
    // Determine element type
    let type = 'content';
    if (tagName.match(/^h[1-6]$/)) {
      type = 'heading';
    } else if (tagName === 'p') {
      type = 'paragraph';
    } else if (tagName === 'pre' || tagName === 'code' || className.includes('code')) {
      type = 'code';
    } else if (tagName === 'table') {
      type = 'table';
    } else if (tagName === 'ul' || tagName === 'ol') {
      type = 'list';
    } else if (tagName === 'img') {
      type = 'image';
    } else if (tagName === 'a') {
      type = 'link';
    } else if (className.includes('confluence-macro')) {
      type = 'macro';
    }
    
    // Create element object
    const element: ExtractedElement = { type };
    
    // Add name for specific elements
    if (type === 'heading') {
      element.name = tagName;
    } else if (type === 'list') {
      element.name = tagName;
    } else if (type === 'macro') {
      element.name = $el.attr('data-macro-name') || id || className;
    }
    
    // Add content
    if (type === 'table') {
      let tableContent = '';
      
      // Process table headers
      $el.find('th').each((i, th) => {
        tableContent += $(th).text().trim() + ' | ';
      });
      
      if (tableContent) {
        tableContent += '\n';
      }
      
      // Process table rows
      $el.find('tr').each((i, tr) => {
        $(tr).find('td').each((j, td) => {
          tableContent += $(td).text().trim() + ' | ';
        });
        tableContent += '\n';
      });
      
      element.content = tableContent.trim();
    } else if (type === 'image') {
      element.src = $el.attr('src');
      element.alt = $el.attr('alt');
    } else if (type === 'link') {
      element.content = text;
      element.src = $el.attr('href');
    } else {
      element.content = text;
    }
    
    extractedElements.push(element);
  });
  
  // Also extract specific Confluence elements that might be nested
  $('.confluence-macro, .confluenceTd, .confluenceTh').each((i, el) => {
    const $el = $(el);
    const className = $el.attr('class') || '';
    const macroName = $el.attr('data-macro-name') || '';
    const text = $el.text().trim();
    
    if (text && !$el.find('.confluence-macro').length) {
      extractedElements.push({
        type: 'macro',
        name: macroName || className,
        content: text
      });
    }
  });
  
  // Extract structured data from specific Confluence elements
  $('.task-list, .status-macro').each((i, el) => {
    const $el = $(el);
    extractedElements.push({
      type: 'structured-data',
      name: $el.attr('class'),
      content: $el.text().trim()
    });
  });
  
  // Recursively extract child elements from complex blocks and panels
  $('.panel, .expand-container').each((i, el) => {
    const $el = $(el);
    const panelTitle = $el.find('.panel-heading, .expand-header').text().trim();
    const panelContent = $el.find('.panel-body, .expand-content').text().trim();
    
    if (panelTitle || panelContent) {
      extractedElements.push({
        type: 'panel',
        name: panelTitle,
        content: panelContent
      });
    }
  });
  
  // Extract attachments and linked files
  $('a.confluence-embedded-file, .attachment').each((i, el) => {
    const $el = $(el);
    const attachmentName = $el.text().trim() || $el.attr('title') || 'Unnamed attachment';
    const href = $el.attr('href') || '';
    
    extractedElements.push({
      type: 'attachment',
      name: attachmentName,
      src: href
    });
  });

  // Extract user mentions and profiles
  $('a.confluence-userlink, .user-mention').each((i, el) => {
    const $el = $(el);
    const username = $el.attr('data-username') || $el.text().trim();
    
    extractedElements.push({
      type: 'user-mention',
      name: username,
      content: $el.text().trim()
    });
  });

  // Extract embedded content (iframes, videos, etc.)
  $('iframe, embed, object, .video-container').each((i, el) => {
    const $el = $(el);
    const src = $el.attr('src') || '';
    const title = $el.attr('title') || 'Embedded content';
    
    extractedElements.push({
      type: 'embedded-content',
      name: title,
      src: src,
      content: $el.html() || ''
    });
  });

  // Extract special Confluence formatting elements
  $('.code-block, .preformatted, .syntaxhighlighter').each((i, el) => {
    const $el = $(el);
    const language = $el.attr('data-language') || 'unknown';
    
    extractedElements.push({
      type: 'code-block',
      name: language,
      content: $el.text().trim()
    });
  });

  // Extract comments and notes
  $('.confluence-information-macro, .note, .warning, .info').each((i, el) => {
    const $el = $(el);
    const macroType = $el.hasClass('note') ? 'note' : 
                      $el.hasClass('warning') ? 'warning' : 
                      $el.hasClass('info') ? 'info' : 'information';
    
    extractedElements.push({
      type: 'information',
      name: macroType,
      content: $el.text().trim()
    });
  });
  
  console.log(`Extracted ${extractedElements.length} elements from the page`);
}

export async function searchConfluenceContent(query: string, limit: number = 5): Promise<any[]> {
  await connectToDatabase();
  
  // Check if this is a code-specific search
  const isCodeSearch = /code|example|sample|implementation|snippet|syntax|function|class|method/i.test(query);
  
  // Split query into keywords for better search results
  const queryKeywords = query.split(/\s+/)
    .filter(word => word.length > 2)  // Filter out short words
    .map(word => word.replace(/['".,;:!?(){}[\]]/g, '')) // Remove punctuation
    .filter(Boolean); // Remove empty strings
  
  try {
    // First attempt: Use the text index search only (most performant)
    const textSearchResults = await ConfluenceContent.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .lean()
      .exec();
    
    if (textSearchResults.length > 0) {
      return textSearchResults;
    }
    
    // For code-specific searches, try a specialized search in code blocks
    if (isCodeSearch) {
      console.log("Attempting specialized code block search");
      
      // Search in extracted code blocks
      const codeBlockResults = await ConfluenceContent.find({
        $or: [
          { 'extractedCodeBlocks.code': { $regex: queryKeywords.join('|'), $options: 'i' } },
          { 'extractedCodeBlocks.language': { $regex: queryKeywords.join('|'), $options: 'i' } }
        ]
      })
        .limit(limit)
        .lean()
        .exec();
        
      if (codeBlockResults.length > 0) {
        console.log(`Found ${codeBlockResults.length} results in code blocks`);
        return codeBlockResults;
      }
    }
    
    // Second attempt: If text search finds nothing, try regex search on content
    const contentResults = await ConfluenceContent.find({
      content: { 
        $regex: queryKeywords.length > 0 
          ? queryKeywords.join('|') 
          : query, 
        $options: 'i' 
      }
    })
      .limit(limit)
      .lean()
      .exec();
    
    if (contentResults.length > 0) {
      return contentResults;
    }
    
    // Last attempt: Try regex search on page titles
    const titleResults = await ConfluenceContent.find({
      pageTitle: { 
        $regex: queryKeywords.length > 0 
          ? queryKeywords.join('|') 
          : query, 
        $options: 'i' 
      }
    })
      .limit(limit)
      .lean()
      .exec();
    
    return titleResults;
  } catch (error) {
    console.error('Error searching Confluence content:', error);
    return [];
  }
} 