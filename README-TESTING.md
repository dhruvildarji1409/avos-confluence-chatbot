# Chat Interface Testing Guide

This guide helps you test and debug the chat interface without having to run the full application.

## Testing Steps

1. First, run the test API server (choose either JavaScript or Python version):

   **JavaScript version:**
   ```bash
   node test-api.js
   ```

   **Python version (provides more test scenarios):**
   ```bash
   python3 test-api.py
   ```

2. Open the test page in your browser:
   - If using Node server: http://localhost:3001
   - If using Python server: http://localhost:3001

3. Test the chat interface by sending different types of messages:
   - Normal messages: Any regular text
   - Error responses: Include "error" in your message
   - Empty responses: Include "empty" in your message
   - Malformed responses: Include "malformed" in your message

4. Observe how the interface handles different response types.

## Testing API Response Format

The expected API response format is:

```json
{
  "answer": "Text response from the AI",
  "sources": [
    {
      "title": "Document Title",
      "url": "https://example.com/document"
    }
  ],
  "sessionId": "unique-session-id",
  "isError": false,
  "isDeepSearch": false
}
```

## Common Issues and Solutions

### 1. "Sorry, I had trouble understanding the server's response"

This error occurs when the chat interface can't parse the API response correctly. Possible causes:

- The API is returning non-JSON data
- The response format is different than expected
- Network issues or timeouts

**Solution:** 
- Check the browser console for error messages
- Verify the API response format matches what the frontend expects
- Use the test servers to simulate different response scenarios
- Make sure the `safeJsonParse` function is handling all error cases

### 2. Loading spinner never stops

This happens when the `isLoading` state doesn't get reset properly.

**Solution:**
- Make sure `setIsLoading(false)` is called in both try/catch blocks
- Add a `finally` block to ensure loading state is always reset

### 3. UI becomes unresponsive after errors

This can happen if error handling doesn't properly update the UI state.

**Solution:**
- Ensure all error cases add an error message to the chat
- Make sure isLoading is always reset

## Next Steps After Testing

Once you've verified the chat interface works correctly with the test API:

1. Run the real application
2. Debug any remaining issues
3. Remove the test files (test-api.js, test-api.py, test-chat.html, etc.)

## API Endpoint Information

The real API endpoint is `/api/chat` on your application server, which has the following characteristics:

- Accepts POST requests
- Expects JSON input with `query` and optional `sessionId`
- Returns JSON with the response data
- Handles error cases with appropriate status codes

If you're still having issues, check the server logs for more detailed error information. 