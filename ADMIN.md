# AVOS ChatBot - Admin Guide

## Troubleshooting MongoDB Index Issues

If you encounter errors related to MongoDB text search or indexes, such as:

```
Failed to produce a solution for TEXT under OR - other non-TEXT clauses under OR have to be indexed as well.
```

### Quick Fix: Rebuild Indexes

Run the following command to rebuild all MongoDB indexes:

```bash
npm run rebuild-indexes
```

This will:
1. Drop all existing indexes
2. Recreate them with the proper configuration
3. Show you a list of all current indexes

The rebuild script (`lib/rebuildIndexes.mjs`) defines and creates the following indexes:

- A text index on `pageTitle` and `content` fields with proper weights
- Regular indexes on `pageTitle` and `content` fields for faster regex queries
- Unique index on `pageId` field (automatically added by MongoDB)

### Manual Index Creation

If the automatic rebuild doesn't work, you can manually create the needed indexes in MongoDB:

```javascript
// Text index on content and pageTitle with weights
db.confluencecontents.createIndex(
  { pageTitle: "text", content: "text" },
  { 
    weights: { pageTitle: 10, content: 5 },
    name: "text_index" 
  }
);

// Regular index on pageTitle
db.confluencecontents.createIndex({ pageTitle: 1 });

// Regular index on content
db.confluencecontents.createIndex({ content: 1 });
```

### Verify Existing Indexes

To check the current indexes in your MongoDB:

```bash
mongo
use avos-bot-confluence-data
db.confluencecontents.getIndexes()
```

### Database Connection

The application connects to MongoDB using the connection string specified in your `.env` file. Make sure it's correctly set:

```
MONGODB_URI=mongodb://localhost:27017/avos-bot-confluence-data
```

## Search Functionality

The application uses a multi-level search strategy:

1. Text search with MongoDB's `$text` operator
2. Regex search on content if text search fails
3. Regex search on titles if content search fails
4. Fallback to a very simple single-word search if all else fails

If you need to further customize the search behavior, check `lib/confluenceParser.ts`.

## Viewing MongoDB Logs

To see what's happening with the search queries, you can start MongoDB with profiling:

```bash
mongod --profile=1 --slowms=0
```

Then check the logs:

```bash
mongo
use avos-bot-confluence-data
db.system.profile.find().pretty()
```

This will show all queries and can help diagnose index issues.

## Need More Help?

If you're still facing issues, please check:

1. MongoDB server version (4.0+ recommended)
2. Database connection string
3. Collection data quality
4. Node.js and NPM versions 