import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = promisify(exec);

interface LlmClientOptions {
  pythonPath?: string;
  scriptPath?: string;
  maxRetries?: number;
}

export interface LlmResponse {
  answer: string;
  error?: string;
}

/**
 * Client for interacting with the Python LLM service
 */
export class LlmClient {
  private pythonPath: string;
  private scriptPath: string = ''; // Initialize to empty string
  private maxRetries: number;

  constructor(options: LlmClientOptions = {}) {
    // Always use python3 as our diagnostic showed it's available and working
    this.pythonPath = options.pythonPath || 'python3';
    
    // Search for the script in multiple locations
    const possiblePaths = [
      // Path provided in options
      options.scriptPath,
      // Path in our lib directory (local copy)
      path.resolve(process.cwd(), 'lib/llm_client.py'),
      // Original path in avos-bot-clean
      path.resolve(process.cwd(), '../avos-bot-clean/src/llm_client.py'),
      // Other possible locations
      path.resolve(process.cwd(), 'src/llm_client.py')
    ].filter(Boolean) as string[];
    
    // Find the first path that exists
    let scriptFound = false;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        this.scriptPath = possiblePath;
        console.log(`Using LLM script at: ${this.scriptPath}`);
        scriptFound = true;
        break;
      }
    }
    
    // If no script was found, use the default path and warn
    if (!scriptFound) {
      this.scriptPath = path.resolve(process.cwd(), 'lib/llm_client.py');
      console.warn(`LLM script not found. Using default path: ${this.scriptPath}`);
    }
    
    this.maxRetries = options.maxRetries || 2;
  }

  /**
   * Get a response from the LLM based on the query and context
   */
  async getResponse(
    query: string, 
    context: string = '', 
    systemPrompt: string = '',
    conversationHistory: any[] = [],
    dbData: any = null
  ): Promise<LlmResponse> {
    // Prepare parameters
    const escapedQuery = JSON.stringify(query);
    const escapedContext = JSON.stringify(context);
    const escapedSystemPrompt = JSON.stringify(systemPrompt);
    const escapedConversationHistory = JSON.stringify(conversationHistory);
    
    // Construct command with properly escaped parameters
    let command = `${this.pythonPath} "${this.scriptPath}" ${escapedQuery} ${escapedContext} ${escapedSystemPrompt} ${escapedConversationHistory}`;
    
    // Add DB data if provided, making sure it's valid JSON
    if (dbData) {
      try {
        // Test that we can stringify it without errors
        const escapedDbData = JSON.stringify(dbData);
        command += ` ${escapedDbData}`;
      } catch (jsonError) {
        console.warn('Error stringifying DB data:', jsonError);
        // Don't add invalid data to the command
      }
    }
    
    try {
      // First try the normal LLM approach with retries
      const llmResponse = await this.tryLlmWithRetries(command, query);
      return llmResponse;
    } catch (error) {
      console.error('All LLM attempts failed, using guaranteed fallback response:', error);
      
      // If everything fails, use this direct in-code fallback
      // This doesn't rely on any external process or script
      return this.generateDirectFallbackResponse(query, context);
    }
  }
  
  // New method to handle retries
  private async tryLlmWithRetries(command: string, query: string): Promise<LlmResponse> {
    // Add debug logging for the command
    console.log('\n==== PYTHON COMMAND ====');
    console.log(command.substring(0, 150) + '...');
    console.log('=======================\n');
    
    // Execute with retries
    let attempt = 0;
    let lastError: Error | null = null;
    
    while (attempt < this.maxRetries) {
      try {
        console.log(`Executing LLM command (attempt ${attempt + 1}/${this.maxRetries})`);
        
        // Log timestamp for debugging
        console.log(`[${new Date().toISOString()}] Starting Python execution`);
        
        const { stdout, stderr } = await execPromise(command);
        
        // Debug logs for the output
        console.log(`\n==== PYTHON EXECUTION RESULT ====`);
        console.log(`STDERR (first 200 chars): ${stderr ? stderr.substring(0, 200) : 'None'}`);
        console.log(`STDOUT (first 100 chars): ${stdout ? stdout.substring(0, 100) + '...' : 'Empty response'}`);
        console.log(`STDOUT Content-Type indicators: HTML=${stdout.includes('<!DOCTYPE') || stdout.includes('<html>')}, JSON=${stdout.includes('{') && stdout.includes('}')}`);
        console.log(`=======================\n`);
        
        if (stderr) {
          console.warn(`LLM client warning: ${stderr}`);
        }
        
        if (!stdout || stdout.trim() === '') {
          throw new Error('Empty response from LLM client');
        }
        
        // Check if the response contains HTML markup which would indicate an error page
        if (stdout.includes('<!DOCTYPE') || stdout.includes('<html') || stdout.includes('</html>')) {
          console.error('Received HTML response instead of text:', stdout.substring(0, 100) + '...');
          throw new Error('Received HTML response instead of text');
        }
        
        // Sanitize the response to remove any HTML-like content that might cause issues
        const sanitizedResponse = stdout.replace(/<[^>]*>/g, '');
        
        return { answer: sanitizedResponse.trim() };
      } catch (error) {
        lastError = error as Error;
        console.error(`LLM client error (attempt ${attempt + 1}/${this.maxRetries}):`, error);
        attempt++;
      }
    }
    
    // If all attempts fail, try the fallback
    try {
      // Call the LLM script with a special flag to use simulated response
      console.log('Falling back to simulated response');
      console.log(`[${new Date().toISOString()}] Starting fallback execution`);
      
      const fallbackCommand = `${this.pythonPath} "${this.scriptPath}" ${JSON.stringify(query)}`;
      console.log(`Fallback command: ${fallbackCommand.substring(0, 100)}...`);
      
      const { stdout, stderr } = await execPromise(fallbackCommand);
      
      // Debug logs for the fallback output
      console.log(`\n==== PYTHON FALLBACK RESULT ====`);
      console.log(`STDERR: ${stderr ? stderr.substring(0, 200) : 'None'}`);
      console.log(`STDOUT (first 100 chars): ${stdout ? stdout.substring(0, 100) + '...' : 'Empty response'}`);
      console.log(`=======================\n`);
      
      if (stderr) {
        console.warn(`LLM client fallback warning: ${stderr}`);
      }
      
      // If fallback returns empty response, throw error to use the direct fallback
      if (!stdout || stdout.trim() === '') {
        throw new Error('Empty response from LLM fallback');
      }
      
      // Check for HTML in fallback response too
      if (stdout.includes('<!DOCTYPE') || stdout.includes('<html') || stdout.includes('</html>')) {
        throw new Error('Received HTML in fallback response');
      }
      
      // Sanitize the fallback response
      const sanitizedResponse = stdout.replace(/<[^>]*>/g, '');
      
      return { answer: sanitizedResponse.trim() };
    } catch (fallbackError) {
      console.error('Script fallback also failed:', fallbackError);
      
      // Log that we're using direct in-code fallback
      console.log('All Python attempts failed, using direct in-code fallback');
      
      throw fallbackError; // Let the parent method handle with direct fallback
    }
  }

  // New method for direct in-code fallback that doesn't rely on Python
  private generateDirectFallbackResponse(query: string, context: string = ''): LlmResponse {
    console.log('Using direct in-code fallback response');
    
    // Simple knowledge base for common queries
    const knowledgeBase: Record<string, string> = {
      'avos': 'AVOS (Autonomous Vehicle Operating System) is NVIDIA\'s comprehensive software stack designed for autonomous vehicles. It provides a flexible, scalable platform that integrates perception, planning, and control systems necessary for self-driving capabilities.',
      'drive': 'NVIDIA DRIVE is a platform that uses AVOS and is designed for developing autonomous vehicles. It includes both hardware (like the DRIVE AGX Orin system-on-a-chip) and software components that work together to enable self-driving capabilities.',
      'driveos': 'DriveOS is the operating system layer of NVIDIA\'s autonomous vehicle software stack. It provides a foundation for running autonomous driving applications, managing hardware resources, and ensuring real-time performance for critical driving functions.',
      'features': 'AVOS includes many features such as:\n- Sensor fusion for combining data from cameras, radar, and lidar\n- Perception systems for object detection and classification\n- Planning and decision-making algorithms\n- Control systems for vehicle operation\n- Simulation capabilities for testing and validation\n- Over-the-air update functionality',
      'help': 'You can ask me questions about AVOS (Autonomous Vehicle Operating System) developed by NVIDIA. I can provide information about its features, capabilities, architecture, and usage. For more detailed searches, try using "Go Search" before your query.',
    };
    
    // Convert query to lowercase for matching
    const queryLower = query.toLowerCase();
    
    // Default response if no match is found
    let response = "I apologize, but I'm currently experiencing technical difficulties connecting to the knowledge base. Here's what I can tell you though: AVOS (Autonomous Vehicle Operating System) is NVIDIA's comprehensive platform for autonomous vehicles. It integrates perception, planning, and control capabilities.";
    
    // Check for exact matches or keywords in the knowledge base
    for (const [key, value] of Object.entries(knowledgeBase)) {
      if (queryLower.includes(key)) {
        response = value;
        break;
      }
    }
    
    // If we have context, use it to enhance the response
    if (context && context.length > 0) {
      response += "\n\nBased on the available information, I can also add: " + context.substring(0, 500);
      if (context.length > 500) {
        response += "...";
      }
    }
    
    // Add a disclaimer
    response += "\n\n**_NOTE:_** I'm currently operating in a limited capacity due to connectivity issues. For more complete answers, please try again later.";
    
    return { 
      answer: response,
      error: "Using direct fallback response due to service unavailability"
    };
  }
  
  /**
   * Format content for optimal LLM processing
   */
  formatContentForLlm(content: any[], maxTokens: number = 6000): string {
    // Basic implementation - can be enhanced with more sophisticated chunking
    let formattedContent = '';
    
    if (Array.isArray(content)) {
      // Format array of content items
      for (const item of content) {
        if (typeof item === 'object') {
          // Format page content
          if (item.pageTitle && item.content) {
            formattedContent += `# ${item.pageTitle}\n\n`;
            
            // Process content to specially mark code blocks and limit to relevance
            const extractedContent = extractRelevantContent(item.content, 800);
            const processedContent = this.processContentWithCodeBlocks(extractedContent);
            formattedContent += `${processedContent}\n\n`;
          }
          
          // Add code snippets if available
          if (item.extractedElements) {
            const codeSnippets = item.extractedElements.filter((el: any) => 
              el.type === 'code' || el.type === 'code-block'
            );
            
            if (codeSnippets.length > 0) {
              formattedContent += "## Code Snippets\n\n";
              for (const snippet of codeSnippets.slice(0, 3)) {
                // Add special markers to indicate exact code blocks
                formattedContent += `<EXACT_CODE_BLOCK>\n\`\`\`\n${snippet.content}\n\`\`\`\n</EXACT_CODE_BLOCK>\n\n`;
              }
            }
          }
        } else if (typeof item === 'string') {
          formattedContent += `${item}\n\n`;
        }
      }
    } else if (typeof content === 'object') {
      // Single content object
      formattedContent = JSON.stringify(content);
    } else {
      // String or other type
      formattedContent = String(content);
    }
    
    // Simple truncation to keep within token limits
    // This is a very rough approximation - about 4 chars per token
    if (formattedContent.length > maxTokens * 4) {
      formattedContent = formattedContent.substring(0, maxTokens * 4) + '...';
    }
    
    return formattedContent;
  }
  
  /**
   * Process content to specially mark code blocks for preservation
   */
  private processContentWithCodeBlocks(content: string): string {
    if (!content) return '';
    
    const lines = content.split('\n');
    let processedLines: string[] = [];
    let inCodeBlock = false;
    let codeBlockLang = '';
    let codeBlockContent: string[] = [];
    
    for (const line of lines) {
      // Check for code block start
      if (line.trim().startsWith('```') && !inCodeBlock) {
        inCodeBlock = true;
        codeBlockLang = line.trim().replace('```', '').trim();
        codeBlockContent = [line]; // Start collecting code block
      } 
      // Check for code block end
      else if (line.trim() === '```' && inCodeBlock) {
        inCodeBlock = false;
        codeBlockContent.push(line); // Add closing marker
        
        // Add special tags around code block
        processedLines.push('<EXACT_CODE_BLOCK>');
        processedLines.push(...codeBlockContent);
        processedLines.push('</EXACT_CODE_BLOCK>');
        
        codeBlockContent = []; // Reset code block content
      } 
      // Inside code block - collect content
      else if (inCodeBlock) {
        codeBlockContent.push(line);
      } 
      // Regular content
      else {
        processedLines.push(line);
      }
    }
    
    // In case we ended with an unclosed code block
    if (inCodeBlock && codeBlockContent.length > 0) {
      processedLines.push('<EXACT_CODE_BLOCK>');
      processedLines.push(...codeBlockContent);
      processedLines.push('```'); // Add closing marker
      processedLines.push('</EXACT_CODE_BLOCK>');
    }
    
    return processedLines.join('\n');
  }
}

// Helper to extract most relevant content by truncating long text
function extractRelevantContent(text: string, maxChars: number = 800): string {
  if (text.length <= maxChars) return text;
  
  // Split by newlines to preserve structure
  const lines = text.split('\n');
  let result = '';
  let charCount = 0;
  
  for (const line of lines) {
    if (charCount + line.length > maxChars) {
      // Check if we can fit at least part of this line
      const remainingChars = maxChars - charCount;
      if (remainingChars > 20) { // Only add if we can fit a meaningful chunk
        result += line.substring(0, remainingChars) + '...';
      }
      break;
    }
    
    result += line + '\n';
    charCount += line.length + 1; // +1 for newline
  }
  
  return result;
}

// Create singleton instance
const llmClient = new LlmClient();
export default llmClient; 