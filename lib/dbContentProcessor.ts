/**
 * Utility for preprocessing content before storing in database
 * Ensures content is clean, properly formatted, and safe for retrieval
 */

/**
 * Processes raw content to be safely stored in database
 * - Preserves code blocks with special markers
 * - Handles special characters safely
 * - Formats content consistently
 * 
 * @param content Raw content to process
 * @returns Sanitized and formatted content
 */
export function sanitizeForDatabase(content: string): string {
  if (!content) return '';
  
  // Replace null bytes and other problematic control characters
  let sanitized = content
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    
  // Process and specially mark code blocks for preservation
  sanitized = processCodeBlocks(sanitized);
  
  // Escape shell-dangerous characters
  sanitized = escapeShellCharacters(sanitized);
  
  return sanitized;
}

/**
 * Process content to specially mark code blocks for preservation
 * Uses special markers that won't interfere with shell commands
 * 
 * @param content Raw content with possible code blocks
 * @returns Content with specially marked code blocks
 */
function processCodeBlocks(content: string): string {
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
      // Use safe markers instead of raw backticks
      processedLines.push(`CODE_BLOCK_START:${codeBlockLang}`);
    } 
    // Check for code block end
    else if (line.trim() === '```' && inCodeBlock) {
      inCodeBlock = false;
      processedLines.push('CODE_BLOCK_END');
    } 
    // Inside code block - escape special characters
    else if (inCodeBlock) {
      // Escape dollar signs, backticks and other shell-interpreted chars in code
      processedLines.push(escapeCodeLine(line));
    } 
    // Regular content
    else {
      processedLines.push(line);
    }
  }
  
  // In case we ended with an unclosed code block
  if (inCodeBlock) {
    processedLines.push('CODE_BLOCK_END');
  }
  
  return processedLines.join('\n');
}

/**
 * Escape special characters in code blocks that could cause shell issues
 * 
 * @param line A line of code to escape
 * @returns Escaped line safe for database and shell
 */
function escapeCodeLine(line: string): string {
  return line
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/!/g, '\\!');
}

/**
 * Escape characters that might cause shell command issues
 * 
 * @param content Content to escape
 * @returns Escaped content safe for shell commands
 */
function escapeShellCharacters(content: string): string {
  return content
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
    .replace(/!/g, '\\!')
    .replace(/"/g, '\\"');
}

/**
 * Restores previously sanitized content to its original form
 * Reverses the sanitization process for display or processing
 * 
 * @param sanitized Previously sanitized content
 * @returns Restored content with proper formatting
 */
export function restoreFromDatabase(sanitized: string): string {
  if (!sanitized) return '';
  
  let restored = sanitized;
  
  // Restore code block markers to actual backtick syntax
  restored = restored
    .replace(/CODE_BLOCK_START:(\w*)/g, '```$1')
    .replace(/CODE_BLOCK_END/g, '```');
  
  // Unescape special characters
  restored = restored
    .replace(/\\\$/g, '$')
    .replace(/\\`/g, '`')
    .replace(/\\\\/g, '\\')
    .replace(/\\"/g, '"')
    .replace(/\\!/g, '!');
  
  return restored;
}

/**
 * Utility function to clean and format content for database insertion
 * Ensures consistent processing across the application
 * 
 * @param pageTitle Page title
 * @param content Raw content to clean and process
 * @returns Formatted document ready for database insertion
 */
export function prepareForDatabaseInsertion(pageTitle: string, content: string, pageUrl: string): Record<string, any> {
  // Sanitize content
  const cleanContent = sanitizeForDatabase(content);
  
  // Extract code blocks for easier searching
  const codeBlocks = extractCodeBlocks(content);
  
  return {
    pageTitle: pageTitle.trim(),
    content: cleanContent,
    pageUrl: pageUrl,
    createdAt: new Date(),
    updatedAt: new Date(),
    extractedCodeBlocks: codeBlocks,
    contentType: 'markdown' // Default assumption
  };
}

/**
 * Extract code blocks from content for specialized storage and search
 * 
 * @param content Content containing code blocks
 * @returns Array of extracted code blocks
 */
export function extractCodeBlocks(content: string): Array<{language: string, code: string}> {
  const codeBlocks: Array<{language: string, code: string}> = [];
  const lines = content.split('\n');
  let inCodeBlock = false;
  let currentLanguage = '';
  let currentCode: string[] = [];
  
  for (const line of lines) {
    // Check for code block start
    if (line.trim().startsWith('```') && !inCodeBlock) {
      inCodeBlock = true;
      currentLanguage = line.trim().replace('```', '').trim();
      currentCode = [];
    } 
    // Check for code block end
    else if (line.trim() === '```' && inCodeBlock) {
      inCodeBlock = false;
      
      // Add completed code block to array
      codeBlocks.push({
        language: currentLanguage,
        code: currentCode.join('\n')
      });
      
      // Reset for next block
      currentCode = [];
      currentLanguage = '';
    } 
    // Inside code block - collect code
    else if (inCodeBlock) {
      currentCode.push(line);
    }
  }
  
  return codeBlocks;
} 