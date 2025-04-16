#!/usr/bin/env node

/**
 * API Diagnostic Tool - Tests the chat API directly
 * Usage: node diagnose-api.js [url]
 * 
 * Example:
 *  node diagnose-api.js http://localhost:3000/api/chat
 *  node diagnose-api.js /api/chat  (uses default server URL)
 */

// Use dynamic import instead of require for ES modules
import('node-fetch').then(({ default: fetch }) => {
  const fs = require('fs');

  // Configuration
  const DEFAULT_SERVER = 'http://localhost:3000';
  const TEST_QUERY = 'Hello, this is a diagnostic test message'; 
  const OUTPUT_FILE = 'api-response.log';

  // Process command line arguments
  const args = process.argv.slice(2);
  let apiUrl = args[0] || '/api/chat';

  // Add default server if only path is provided
  if (apiUrl.startsWith('/')) {
    apiUrl = DEFAULT_SERVER + apiUrl;
  }

  console.log('==============================================');
  console.log('API DIAGNOSTIC TOOL');
  console.log('==============================================');
  console.log('Testing API endpoint:', apiUrl);

  async function runDiagnostics() {
    try {
      console.log('\nSending test request...');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'API-Diagnostic-Tool/1.0'
        },
        body: JSON.stringify({
          query: TEST_QUERY,
          sessionId: 'diagnostic-session'
        }),
      });
      
      console.log('Response status:', response.status);
      console.log('Response status text:', response.statusText);
      
      // Check if the response has headers
      console.log('\nResponse headers:');
      const headers = {};
      response.headers.forEach((value, name) => {
        console.log(`  ${name}: ${value}`);
        headers[name] = value;
      });
      
      // Get content type
      const contentType = response.headers.get('content-type') || 'unknown';
      console.log('\nContent-Type:', contentType);
      
      // Get the response body
      const text = await response.text();
      console.log(`\nResponse length: ${text.length} characters`);
      
      // Try to determine if it's JSON or HTML
      let responseType = 'Unknown';
      let parsedData = null;
      
      if (contentType.includes('application/json')) {
        responseType = 'JSON';
        try {
          parsedData = JSON.parse(text);
          console.log('✅ Successfully parsed as JSON');
        } catch (e) {
          console.log('❌ Failed to parse as JSON despite Content-Type');
          responseType = 'Invalid JSON';
        }
      } else if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        responseType = 'HTML';
        
        // Try to extract error information
        const titleMatch = text.match(/<title>(.*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          console.log('HTML page title:', titleMatch[1].trim());
        }
        
        // Look for common error patterns
        if (text.includes('Internal Server Error') || text.includes('500')) {
          console.log('❌ Detected 500 Internal Server Error page');
        } else if (text.includes('404 Not Found')) {
          console.log('❌ Detected 404 Not Found page');
        }
      } else {
        responseType = 'Plain text';
      }
      
      console.log(`\nResponse appears to be: ${responseType}`);
      
      // Save the response to a file for detailed inspection
      const logData = {
        timestamp: new Date().toISOString(),
        url: apiUrl,
        method: 'POST',
        requestBody: { query: TEST_QUERY, sessionId: 'diagnostic-session' },
        responseStatus: response.status,
        responseHeaders: headers,
        responseType,
        responseSummary: text.substring(0, 1000) + (text.length > 1000 ? '...' : ''),
        parsedData
      };
      
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(logData, null, 2));
      console.log(`\nDetailed response saved to ${OUTPUT_FILE}`);
      
      // Provide recommendations based on findings
      console.log('\n==============================================');
      console.log('DIAGNOSIS:');
      console.log('==============================================');
      
      if (response.status >= 500) {
        console.log('❌ Server error detected (5xx status code)');
        console.log('Recommendation: Check server logs for internal errors');
      } else if (response.status >= 400) {
        console.log('❌ Client error detected (4xx status code)');
        console.log('Recommendation: Check request format and authentication');
      }
      
      if (responseType === 'HTML') {
        console.log('❌ Server is returning HTML instead of JSON');
        console.log('Possible causes:');
        console.log('  1. Server-side error (check logs)');
        console.log('  2. API endpoint is incorrect');
        console.log('  3. Authentication/authorization issue');
        console.log('  4. Server middleware intercepting the request');
      } else if (responseType === 'Invalid JSON') {
        console.log('❌ Server is returning invalid JSON');
        console.log('Recommendation: Check server-side JSON serialization');
      } else if (responseType === 'JSON' && parsedData) {
        if (!parsedData.answer) {
          console.log('⚠️ JSON response is missing expected "answer" field');
          console.log('Recommendation: Check server-side response formatting');
        } else {
          console.log('✅ JSON response contains expected "answer" field');
        }
        
        console.log('\nJSON response structure:');
        console.log(JSON.stringify(parsedData, null, 2));
      }
      
      console.log('\n==============================================');
      console.log('NEXT STEPS:');
      console.log('==============================================');
      console.log('1. Check server logs for errors');
      console.log('2. Verify API endpoint URL is correct');
      console.log('3. Check that your server has proper CORS configuration');
      console.log('4. Review the saved response file for more details');
      
    } catch (error) {
      console.error('\n❌ Error running diagnostics:', error.message);
      console.log('\nThis could indicate:');
      console.log('1. The server is not running');
      console.log('2. Network connectivity issues');
      console.log('3. CORS issues blocking the request');
      
      // Write error to file
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
        timestamp: new Date().toISOString(),
        url: apiUrl,
        error: error.message,
        stack: error.stack
      }, null, 2));
      
      console.log(`\nError details saved to ${OUTPUT_FILE}`);
    }
  }

  runDiagnostics();
}).catch(err => {
  console.error('Error importing node-fetch:', err.message);
  console.log('\nPlease install node-fetch using one of these commands:');
  console.log('  npm install node-fetch@2.6.7');
  console.log('OR for ESM support:');
  console.log('  npm install node-fetch');
}); 