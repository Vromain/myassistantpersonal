# Backend API - AI-Powered Communication Hub

**Node.js + TypeScript + Express + MongoDB**

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Environment Variables

Create `.env` file (see `.env.example` for template):

```bash
# Required
MONGODB_URI=mongodb://localhost:27017/commhub
OLLAMA_LOCAL_URL=http://localhost:11434
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
JWT_SECRET=your-secret-key-min-32-characters

# Optional
OLLAMA_REMOTE_URL=http://94.23.49.185:11434
OLLAMA_MODEL=llama3.1:8b
PORT=3000
```

## Project Structure

```
backend/
├── src/
│   ├── server.ts                     # Express app entry point
│   ├── db/
│   │   └── connection.ts             # MongoDB connection
│   ├── models/                       # Mongoose schemas
│   │   ├── user.ts                  # User model
│   │   ├── connected_account.ts     # OAuth accounts
│   │   ├── message.ts               # Messages
│   │   ├── category.ts              # Categories
│   │   └── index.ts                 # Model exports
│   ├── services/
│   │   ├── ollama_client.ts         # Ollama AI client
│   │   ├── oauth_manager.ts         # OAuth token manager
│   │   ├── message_aggregator.ts    # Message aggregation
│   │   ├── sync_scheduler.ts        # Background sync scheduler
│   │   ├── auth/
│   │   │   └── gmail_strategy.ts    # Gmail OAuth strategy
│   │   ├── sync/
│   │   │   └── gmail_sync.ts        # Gmail sync service
│   │   └── index.ts                 # Service exports
│   ├── api/                          # REST endpoints
│   │   ├── auth/
│   │   │   └── gmail.ts             # Gmail OAuth routes
│   │   ├── messages/
│   │   │   └── index.ts             # Messages routes
│   │   └── index.ts                 # API exports
│   └── middleware/
│       ├── auth.ts                   # JWT authentication
│       └── index.ts                  # Middleware exports
└── tests/                            # Tests (TODO)
```

## Available Scripts

```bash
npm run dev        # Start development server with hot reload
npm run build      # Build TypeScript to JavaScript
npm start          # Run production build
npm test           # Run tests
npm run lint       # Lint code
npm run format     # Format code with Prettier
```

## API Endpoints

### Health & Info

#### GET /health
Health check endpoint

```json
{
  "status": "ok",
  "timestamp": "2025-11-16T17:00:00.000Z",
  "uptime": 123.45,
  "environment": "development"
}
```

#### GET /api/v1
API information and available endpoints

### Authentication (OAuth)

#### GET /api/v1/auth/gmail
Initiate Gmail OAuth flow - redirects to Google consent screen

#### GET /api/v1/auth/gmail/callback
OAuth callback endpoint (handled automatically)

#### POST /api/v1/auth/gmail/disconnect
Disconnect Gmail account (requires auth)
```json
{ "accountId": "..." }
```

#### GET /api/v1/auth/gmail/status
Check Gmail connection status (requires auth)

#### POST /api/v1/auth/gmail/test
Test Gmail API connection (requires auth)
```json
{ "accountId": "..." }
```

### Messages

All message endpoints require authentication via `Authorization: Bearer <token>` header.

#### GET /api/v1/messages
List messages with filters and pagination

Query parameters:
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 50, max: 100)
- `platforms` (string): Comma-separated platforms (gmail, exchange, imap)
- `priority` (string): high, medium, low
- `readStatus` (boolean): true/false
- `urgent` (boolean): true/false
- `categoryId` (string): MongoDB ObjectId
- `sortBy` (string): timestamp, priorityScore, sender
- `sortOrder` (string): asc, desc

#### GET /api/v1/messages/unread/count
Get unread messages count

#### GET /api/v1/messages/urgent
Get urgent messages

#### GET /api/v1/messages/:id
Get single message by ID

#### PATCH /api/v1/messages/:id/read
Mark message as read/unread
```json
{ "readStatus": true }
```

#### PATCH /api/v1/messages/:id/archive
Archive or unarchive message
```json
{ "archive": true }
```

#### GET /api/v1/messages/:id/thread
Get message thread (all related messages)

#### GET /api/v1/messages/:id/replies
Generate AI-powered reply suggestions

#### POST /api/v1/messages/:id/categorize
Categorize message using AI

#### POST /api/v1/messages/search
Full-text search messages
```json
{
  "query": "search text",
  "page": 1,
  "limit": 50
}
```

#### POST /api/v1/messages/sync
Trigger manual sync for user's accounts

#### POST /api/v1/messages/bulk/read
Bulk mark messages as read
```json
{ "messageIds": ["id1", "id2", ...] }
```

#### POST /api/v1/messages/bulk/archive
Bulk archive messages
```json
{ "messageIds": ["id1", "id2", ...] }
```

## Database Models

### User
- Email (unique)
- Subscription tier (free/premium)
- Preferences (quiet hours, notifications)
- Connected accounts (max 5 for free, 10 for premium)

### ConnectedAccount
- OAuth tokens (AES-256 encrypted)
- Platform (gmail, exchange, imap, etc.)
- Sync status
- Connection health

### Message
- Multi-platform support
- Priority score (0-100)
- Urgency detection
- Full-text search indexed
- Attachments support

### Category
- Predefined (Work, Personal, Shopping, etc.)
- Custom categories per user
- Auto-assignment rules

## Ollama Integration

### AI Features

1. **Priority Scoring**: Analyze message and assign score 0-100
2. **Reply Generation**: Generate 3-5 contextual reply suggestions
3. **Categorization**: Classify messages into categories

### Usage Example

```typescript
import { ollamaClient } from './services/ollama_client';

// Check Ollama availability
const health = await ollamaClient.healthCheck();

// Score message priority
const result = await ollamaClient.scorePriority({
  subject: 'Urgent: Server Down',
  content: 'Production server is not responding...',
  sender: 'admin@company.com'
});
// { score: 95, reasoning: 'Urgent keyword, critical infrastructure issue' }

// Generate reply suggestions
const replies = await ollamaClient.generateReplies(
  'Can we schedule a meeting tomorrow?'
);
// ['Yes, I'm available tomorrow. What time works for you?', ...]

// Categorize message
const category = await ollamaClient.categorize(
  { subject: 'Team meeting notes', content: '...' },
  ['Work', 'Personal', 'Shopping']
);
// { category: 'Work', confidence: 0.95 }
```

## Development

### Prerequisites

- Node.js 20.x LTS
- MongoDB 5.x+ or MongoDB Atlas
- Ollama running locally or access to remote instance

### Setup MongoDB

**Local**:
```bash
# Install MongoDB
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Connection string
MONGODB_URI=mongodb://localhost:27017/commhub
```

**Cloud (MongoDB Atlas)**:
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Add to `.env`

### Setup Ollama

```bash
# Install Ollama
brew install ollama  # macOS
# or download from https://ollama.ai

# Start Ollama
ollama serve

# Pull model
ollama pull llama3.1:8b

# Test
curl http://localhost:11434/api/tags
```

### OAuth Setup (Gmail)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project
3. Enable Gmail API
4. Create OAuth2 credentials
5. Add redirect URI: `http://localhost:3000/auth/gmail/callback`
6. Copy Client ID and Secret to `.env`

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Security

- ✅ OAuth tokens encrypted with AES-256
- ✅ JWT for session management
- ✅ Helmet.js for security headers
- ✅ Rate limiting enabled
- ✅ CORS configured
- ⚠️ **Important**: Change `JWT_SECRET` and `ENCRYPTION_KEY` in production!

## Deployment

### Environment Variables (Production)

Ensure these are set in production:

```bash
NODE_ENV=production
MONGODB_URI=<production-mongodb-uri>
JWT_SECRET=<strong-secret-min-32-chars>
ENCRYPTION_KEY=<strong-key-32-chars>
GOOGLE_CLIENT_ID=<production-client-id>
GOOGLE_CLIENT_SECRET=<production-client-secret>
OLLAMA_REMOTE_URL=http://94.23.49.185:11434
```

### Build & Deploy

```bash
# Build
npm run build

# Start production server
npm start
```

## Troubleshooting

### MongoDB Connection Failed

```bash
# Check MongoDB is running
mongosh

# Check connection string format
mongodb://localhost:27017/commhub
# or
mongodb+srv://user:pass@cluster.mongodb.net/commhub
```

### Ollama Not Responding

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama
ollama serve

# Check model is pulled
ollama list
```

### OAuth Errors

- Verify redirect URI matches Google Console exactly
- Check credentials are not expired
- Ensure Gmail API is enabled

## License

MIT

## Support

For issues, see [IMPLEMENTATION_GUIDE.md](../IMPLEMENTATION_GUIDE.md)
