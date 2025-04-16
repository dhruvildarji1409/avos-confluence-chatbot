// Test script to simulate API response
const testApiResponse = {
  answer: "This is a test response from the API. It simulates a successful message.",
  sources: [
    { title: "Test Document 1", url: "https://example.com/doc1" },
    { title: "Test Document 2", url: "https://example.com/doc2" }
  ],
  sessionId: "test-session-123"
};

// Run server to simulate API response
const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      console.log('Received request body:', body);
      
      // Set CORS headers to allow requests from localhost
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      // Set content type to JSON
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      
      // Send the test response
      res.end(JSON.stringify(testApiResponse));
    });
  } else if (req.method === 'OPTIONS') {
    // Handle preflight requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 204;
    res.end();
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Test API server running at http://localhost:${PORT}`);
  console.log(`Send POST requests to http://localhost:${PORT}/api/chat`);
}); 