/**
 * Utility functions to analyze queries and determine if database access is needed
 */

interface QueryAnalysisResult {
  needsDatabase: boolean;
  reason: string;
  confidence: number; // 0-1 scale
}

/**
 * Analyzes a query to determine if it requires database access
 * @param query The user query to analyze
 * @returns Analysis result with determination if DB is needed
 */
export function analyzeQueryForDatabaseNeed(query: string): QueryAnalysisResult {
  // Convert to lowercase for easier pattern matching
  const queryLower = query.toLowerCase();
  
  // Check for explicit database search request
  if (queryLower.includes('go search')) {
    return {
      needsDatabase: true,
      reason: 'Explicit "go search" command detected',
      confidence: 1.0
    };
  }
  
  // Keywords and phrases that strongly indicate need for domain-specific knowledge
  const databaseNeededKeywords = [
    'avos', 'driveos', 'drive os', 'nvidia drive', 'drive platform', 
    'orin', 'hyperion', 'pegasus', 'xavier', 'agx',
    'ndas', 'nvdriveworks', 'drive works', 'driveworks',
    'self-driving', 'autonomous driving', 'autonomous vehicle',
    'perception', 'planning', 'mapping', 'localization',
    'system architecture', 'hardware', 'software stack',
    'deployment', 'features', 'capabilities', 'modules',
    'api', 'interface', 'configuration', 'setup', 'installation',
    'developer guide', 'user guide', 'documentation',
    'version', 'release', 'update', 'changelog'
  ];
  
  // Check if query contains any of the database-needed keywords
  for (const keyword of databaseNeededKeywords) {
    if (queryLower.includes(keyword)) {
      return {
        needsDatabase: true,
        reason: `Contains domain-specific term: "${keyword}"`,
        confidence: 0.85
      };
    }
  }
  
  // Patterns that suggest questions about technical specifics or documentation
  const technicalPatterns = [
    /how (do|can|does|to) .* (in|with|using) (avos|driveos|nvidia)/i,
    /what (is|are) .* (in|of) (avos|driveos|nvidia)/i,
    /where .* (find|located|documented)/i,
    /when .* (released|updated|available)/i,
    /which .* (version|component|module|feature)/i,
    /why .* (designed|implemented|configured)/i
  ];
  
  // Check if query matches any technical patterns
  for (const pattern of technicalPatterns) {
    if (pattern.test(query)) {
      return {
        needsDatabase: true,
        reason: 'Query pattern suggests technical/documentation question',
        confidence: 0.75
      };
    }
  }
  
  // Questions that are likely general and don't need domain knowledge
  const generalPatterns = [
    /^(hi|hello|hey|greetings)/i,
    /how are you/i,
    /what time is it/i,
    /what is the weather/i,
    /tell me a joke/i,
    /thank you/i,
    /explain .* (to|for) me/i,
    /define .* (in|for) me/i
  ];
  
  // Check if query matches general patterns
  for (const pattern of generalPatterns) {
    if (pattern.test(query)) {
      return {
        needsDatabase: false,
        reason: 'General conversation or common knowledge question',
        confidence: 0.8
      };
    }
  }
  
  // If query is very short, likely not needing database
  if (query.split(' ').length < 3) {
    return {
      needsDatabase: false,
      reason: 'Query too short to require specific database knowledge',
      confidence: 0.6
    };
  }
  
  // Default to needing database but with lower confidence
  // This is a fail-safe approach - better to check DB when unsure
  return {
    needsDatabase: true,
    reason: 'Unable to determine confidently, defaulting to database search',
    confidence: 0.4
  };
}

/**
 * Determines if a query is a follow-up question that would need context from previous conversation
 * @param query The user query
 * @returns True if the query appears to be a follow-up question
 */
export function isFollowUpQuestion(query: string): boolean {
  const queryLower = query.toLowerCase().trim();
  
  // Patterns that strongly indicate follow-up questions
  const followUpPatterns = [
    /^(and|also|additionally|moreover|furthermore)/i,
    /^(what|how) about/i,
    /^(can|could) you (explain|elaborate|clarify)/i,
    /^(tell|show) me more/i,
    /^(why|how come)/i,
    /^(is|are|does|do) it/i,
    /^(what|which|where|when) (is|are|were) (it|they|those|that|this|these)/i
  ];
  
  // Check if the query matches any follow-up patterns
  for (const pattern of followUpPatterns) {
    if (pattern.test(queryLower)) {
      return true;
    }
  }
  
  // Check for pronouns without clear referents, which often indicate follow-ups
  const pronounsWithoutContext = [
    /^(it|this|that|they|them|those|these) /i,
    / (it|this|that|they|them|those|these)(\?|\.|\!|$)/i
  ];
  
  for (const pattern of pronounsWithoutContext) {
    if (pattern.test(queryLower)) {
      return true;
    }
  }
  
  return false;
} 