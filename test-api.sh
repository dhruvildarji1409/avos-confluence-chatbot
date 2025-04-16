#!/bin/bash

# Simple API tester using curl
# Usage: ./test-api.sh [api_url]

# Default API URL
API_URL=${1:-"http://localhost:3000/api/chat"}

echo "==========================="
echo "API TEST USING CURL"
echo "==========================="
echo "Testing endpoint: $API_URL"
echo ""

# Create a temporary file for output
OUTPUT_FILE="curl-response.txt"

# Test message
TEST_MSG="This is a test message from curl"

echo "Sending request..."
echo ""

# Send the request and save both headers and body
curl -v -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{\"query\":\"$TEST_MSG\",\"sessionId\":null}" \
  "$API_URL" \
  -o "$OUTPUT_FILE" \
  2>&1 | grep -E "^[<>]|^[*]"

echo ""
echo "Response saved to $OUTPUT_FILE"

# Check if the response looks like HTML or JSON
if grep -q "<!DOCTYPE" "$OUTPUT_FILE" || grep -q "<html" "$OUTPUT_FILE"; then
  echo "⚠️ WARNING: Response appears to be HTML, not JSON!"
  echo ""
  echo "HTML Title:"
  grep -o "<title>[^<]*</title>" "$OUTPUT_FILE" | sed 's/<title>\(.*\)<\/title>/\1/'
  echo ""
  echo "First few lines:"
  head -n 10 "$OUTPUT_FILE"
else
  # Try to pretty print if it's JSON
  if jq '.' "$OUTPUT_FILE" > /dev/null 2>&1; then
    echo "✅ Response is valid JSON"
    echo ""
    echo "JSON Structure:"
    jq '.' "$OUTPUT_FILE"
  else
    echo "❌ Response is not valid JSON but also not HTML"
    echo ""
    echo "First few lines:"
    head -n 10 "$OUTPUT_FILE"
  fi
fi

echo ""
echo "==========================="
echo "RECOMMENDATIONS"
echo "==========================="
echo "1. If you see HTML, check your server logs for errors"
echo "2. Ensure your API route is correctly implemented"
echo "3. Check database connections in your API handlers" 