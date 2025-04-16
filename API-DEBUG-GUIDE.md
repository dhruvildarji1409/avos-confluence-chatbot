# API Debug Guide: Fixing HTML Responses Instead of JSON

This guide will help you diagnose and fix the issue where your server is returning HTML pages instead of JSON responses.

## Diagnostic Tools

I've created several tools to help diagnose the issue:

1. **Enhanced ChatInterface.tsx**:
   - Improved error handling for HTML responses
   - Extracts error details from HTML pages
   - Provides better error messages

2. **diagnose-api.js**: Directly tests your API endpoint
   ```bash
   # Install required dependency
   npm install node-fetch
   
   # Run diagnostics against your API
   node diagnose-api.js http://localhost:3000/api/chat
   ```

3. **api-proxy.js**: Creates a proxy server that logs all request/response details
   ```bash
   # Start proxy server (default port 8080)
   node api-proxy.js
   
   # Then modify your frontend to use http://localhost:8080 instead of your real API
   ```

## Common Causes for HTML Instead of JSON

When an API returns HTML instead of JSON, it's typically because:

1. **Server-side error**: The server is encountering an error and returning an error page
2. **Wrong route/endpoint**: The request is hitting a webpage route instead of API
3. **Authentication issue**: Auth middleware is redirecting to a login page
4. **CORS issue**: A CORS error page is being returned
5. **Content negotiation**: The server isn't honoring Accept headers

## Debugging Steps

### 1. Check Server Logs

First and most important! Look at your server logs when making a request:

```bash
# If running Next.js
npm run dev

# Or check log files
cat server.log
```

### 2. Verify Request Format

Ensure your requests are correctly formatted:

```javascript
fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: JSON.stringify({
    query: 'Test message',
    sessionId: null
  })
})
```

### 3. Check API Route Implementation

Review your API code at `app/api/chat/route.ts`:

- Ensure it's returning `NextResponse.json()` and not HTML
- Make sure error handling doesn't return HTML
- Check for proper CORS headers

### 4. Test with curl

Test your API endpoint directly using curl:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"query":"test message","sessionId":null}' \
  http://localhost:3000/api/chat
```

### 5. Check for Middleware Issues

Next.js middlewares can sometimes cause issues. Check if you have middleware redirecting requests.

### 6. Test with the Proxy

Use the proxy tool to see exactly what's being sent and received:

```bash
node api-proxy.js 8080 http://localhost:3000/api/chat
```

Then modify your frontend to use http://localhost:8080 or test with curl:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"query":"test message"}' \
  http://localhost:8080
```

Check the logs in the `api-logs` directory.

## Common Fixes

### 1. Fix NextResponse Format

In `app/api/chat/route.ts`, ensure you're using:

```typescript
return NextResponse.json(data, { status: 200 });
```

Not:

```typescript
return new Response(JSON.stringify(data), { 
  headers: { 'Content-Type': 'application/json' } 
});
```

### 2. Add Error Handling

Make sure all error cases return JSON:

```typescript
try {
  // API code
} catch (error) {
  console.error('API error:', error);
  return NextResponse.json(
    { error: 'Internal server error', answer: 'Sorry, an error occurred' },
    { status: 500 }
  );
}
```

### 3. Check Database Connections

Many server errors come from database issues:

```typescript
// Make sure database connections are properly handled
try {
  await connectToDatabase();
} catch (dbError) {
  console.error('Database connection failed:', dbError);
  return NextResponse.json(
    { error: 'Database connection failed', answer: 'Sorry, database error' },
    { status: 500 }
  );
}
```

### 4. Add CORS Headers

If CORS is an issue, add appropriate headers:

```typescript
export async function POST(request: Request) {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  
  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  
  // Rest of your API code...
  
  // Return with CORS headers
  return NextResponse.json(data, { status: 200, headers });
}
```

## Final Steps

After making changes:

1. Restart your server
2. Clear browser cache
3. Test with the diagnostic tools again
4. If still having issues, check for more detailed errors in your server logs

If you need more assistance, the detailed logs produced by the tools should provide clues as to what's happening. 