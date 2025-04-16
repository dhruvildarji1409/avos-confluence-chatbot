#!/usr/bin/env node

/**
 * API Proxy Server
 * 
 * This creates a simple proxy server that forwards requests to the real API
 * but adds detailed logging and CORS headers. Use this to debug API issues.
 * 
 * Usage: node api-proxy.js [port] [target_url]
 * 
 * Example:
 *  node api-proxy.js 8080 http://localhost:3000/api/chat
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');

// Configuration
const DEFAULT_PORT = 8080;
const DEFAULT_TARGET = 'http://localhost:3000/api/chat';
const LOG_DIR = './api-logs';

// Process command line arguments
const args = process.argv.slice(2);
const PORT = args[0] ? parseInt(args[0], 10) : DEFAULT_PORT;
const TARGET_URL = args[1] || DEFAULT_TARGET;

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

// Parse the target URL
const parsedUrl = url.parse(TARGET_URL);
const targetProtocol = parsedUrl.protocol;
const targetHostname = parsedUrl.hostname;
const targetPort = parsedUrl.port || (targetProtocol === 'https:' ? 443 : 80);
const targetPath = parsedUrl.path;

console.log('==============================================');
console.log('API PROXY SERVER');
console.log('==============================================');
console.log(`Listening on: http://localhost:${PORT}`);
console.log(`Forwarding to: ${TARGET_URL}`);
console.log(`Request logs: ${LOG_DIR}`);
console.log('==============================================');

// Create the proxy server
const server = http.createServer((req, res) => {
  const requestId = Date.now() + '-' + Math.floor(Math.random() * 1000);
  const logFile = `${LOG_DIR}/request-${requestId}.log`;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  
  // Only handle POST to /api/chat
  if (req.method !== 'POST') {
    res.statusCode = 400;
    res.end('This proxy only supports POST requests');
    return;
  }
  
  // Get request body
  let requestBody = '';
  req.on('data', chunk => {
    requestBody += chunk.toString();
  });
  
  req.on('end', () => {
    console.log(`[${new Date().toISOString()}] Received request`);
    
    // Log request details
    let requestLog = {
      timestamp: new Date().toISOString(),
      requestId: requestId,
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: tryParseJson(requestBody)
    };
    
    console.log(`Request body: ${requestBody.substring(0, 100)}${requestBody.length > 100 ? '...' : ''}`);
    
    // Prepare the forwarding options
    const options = {
      hostname: targetHostname,
      port: targetPort,
      path: targetPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };
    
    // Create the request to the target server
    const httpModule = targetProtocol === 'https:' ? https : http;
    const proxyReq = httpModule.request(options, proxyRes => {
      console.log(`[${new Date().toISOString()}] Received response from target`);
      console.log(`Status: ${proxyRes.statusCode} ${proxyRes.statusMessage}`);
      
      // Set response headers
      Object.keys(proxyRes.headers).forEach(key => {
        res.setHeader(key, proxyRes.headers[key]);
      });
      
      // Ensure we're setting a content type
      if (!proxyRes.headers['content-type']) {
        res.setHeader('Content-Type', 'application/json');
      }
      
      // Set status code
      res.statusCode = proxyRes.statusCode;
      
      // Get response body
      let responseBody = '';
      proxyRes.on('data', chunk => {
        responseBody += chunk;
      });
      
      proxyRes.on('end', () => {
        console.log(`Response body: ${responseBody.substring(0, 100)}${responseBody.length > 100 ? '...' : ''}`);
        
        // Log response details
        requestLog.response = {
          statusCode: proxyRes.statusCode,
          statusMessage: proxyRes.statusMessage,
          headers: proxyRes.headers,
          body: tryParseResponseBody(responseBody, proxyRes.headers['content-type'])
        };
        
        // Classify response
        const contentType = proxyRes.headers['content-type'] || '';
        let responseType = 'Unknown';
        
        if (contentType.includes('application/json')) {
          responseType = 'JSON';
          try {
            JSON.parse(responseBody);
          } catch (e) {
            responseType = 'Invalid JSON';
            requestLog.parseError = e.message;
          }
        } else if (responseBody.includes('<!DOCTYPE') || responseBody.includes('<html')) {
          responseType = 'HTML';
        } else {
          responseType = 'Plain text';
        }
        
        requestLog.responseType = responseType;
        
        // Save the complete log
        fs.writeFileSync(logFile, JSON.stringify(requestLog, null, 2));
        console.log(`Log saved to ${logFile}`);
        
        // Send the response
        res.end(responseBody);
      });
    });
    
    proxyReq.on('error', error => {
      console.error('Error forwarding request:', error);
      
      requestLog.error = {
        message: error.message,
        stack: error.stack
      };
      
      // Save error log
      fs.writeFileSync(logFile, JSON.stringify(requestLog, null, 2));
      
      // Send error response
      res.statusCode = 502;
      res.end(JSON.stringify({
        error: 'Error connecting to target server',
        message: error.message
      }));
    });
    
    // Send the request body
    proxyReq.write(requestBody);
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
});

// Helper functions
function tryParseJson(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}

function tryParseResponseBody(body, contentType) {
  if (!contentType) return body;
  
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(body);
    } catch (e) {
      return body;
    }
  }
  
  return body;
} 