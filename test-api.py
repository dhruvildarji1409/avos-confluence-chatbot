#!/usr/bin/env python3
import http.server
import socketserver
import json
import time
from urllib.parse import parse_qs, urlparse

# Configure test server port
PORT = 3001

# Test responses
RESPONSES = {
    "normal": {
        "answer": "This is a test response from the API. It simulates a successful message.",
        "sources": [
            {"title": "Test Document 1", "url": "https://example.com/doc1"},
            {"title": "Test Document 2", "url": "https://example.com/doc2"}
        ],
        "sessionId": "test-session-123"
    },
    "error": {
        "answer": "Sorry, I encountered an error while processing your request.",
        "sources": [],
        "isError": True,
        "sessionId": "test-session-error"
    },
    "empty": {},
    "malformed": "This is not a JSON object"
}

class TestApiHandler(http.server.SimpleHTTPRequestHandler):
    def _set_response_headers(self, content_type="application/json"):
        self.send_response(200)
        self.send_header("Content-type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")  # CORS
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        # This handles the loading of the HTML file for testing
        if self.path == "/" or self.path == "/index.html":
            self.path = "/test-chat.html"
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        content_length = int(self.headers["Content-Length"])
        post_data = self.rfile.read(content_length).decode("utf-8")
        
        print(f"\nReceived POST request to {self.path}")
        print(f"Request body: {post_data}")
        
        if self.path == "/api/chat":
            # Process the chat request
            try:
                request_json = json.loads(post_data)
                query = request_json.get("query", "")
                
                print(f"Processing query: {query}")
                
                # Determine which response to send based on query content
                response_type = "normal"
                if "error" in query.lower():
                    response_type = "error"
                elif "empty" in query.lower():
                    response_type = "empty"
                elif "malformed" in query.lower():
                    response_type = "malformed"
                    
                # Simulate processing delay
                time.sleep(1)
                
                # Send the appropriate response
                self._set_response_headers()
                
                if response_type == "malformed":
                    self.wfile.write(RESPONSES[response_type].encode())
                else:
                    self.wfile.write(json.dumps(RESPONSES[response_type]).encode())
                    
                print(f"Sent {response_type} response")
                
            except json.JSONDecodeError:
                self._set_response_headers()
                error_response = {
                    "error": "Invalid JSON in request",
                    "answer": "The server could not parse your request as valid JSON.",
                    "isError": True
                }
                self.wfile.write(json.dumps(error_response).encode())
                print("Sent error response due to invalid JSON")
                
            except Exception as e:
                self._set_response_headers()
                error_response = {
                    "error": str(e),
                    "answer": "The server encountered an unexpected error while processing your request.",
                    "isError": True
                }
                self.wfile.write(json.dumps(error_response).encode())
                print(f"Sent error response due to exception: {str(e)}")
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not found")

def run_server():
    try:
        with socketserver.TCPServer(("", PORT), TestApiHandler) as httpd:
            print(f"Test API server running at http://localhost:{PORT}")
            print("Available test queries:")
            print("  - Normal response: any regular query")
            print("  - Error response: include 'error' in your query")
            print("  - Empty response: include 'empty' in your query")
            print("  - Malformed response: include 'malformed' in your query")
            print("\nPress Ctrl+C to stop the server")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped by user")

if __name__ == "__main__":
    run_server() 