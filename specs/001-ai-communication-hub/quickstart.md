# Quickstart Guide: AI-Powered Communication Hub

**Feature**: 001-ai-communication-hub | **Version**: 1.0.0 | **Date**: 2025-11-16

This guide helps developers set up and start developing the AI-Powered Communication Hub from scratch.

## Prerequisites

- **Flutter SDK**: 3.16+ with Dart 3.x
- **Node.js**: 20.x LTS
- **PostgreSQL**: 15.x (or Supabase account)
- **Ollama**: running on (http://localhost:11434/)
- **Git**: For version control

## Project Overview

The AI-Powered Communication Hub is a cross-platform application (web, iOS, Android) that unifies email, social media, and messaging platforms into a single interface with AI-powered features.

**Architecture**:
- **Frontend**: Flutter (Dart) - `myassistanpersonal/`
- **Backend**: Node.js + Express (TypeScript) - `backend/`
- **Database**: PostgreSQL (Supabase for managed hosting + real-time)
- **AI**: Ollama (cloud-hosted for production)
- **Notifications**: Firebase Cloud Messaging

## Setup Steps

### 1. Clone Repository

```bash
git clone <repository-url>
cd myassistanpersonal
git checkout 001-ai-communication-hub
```

### 2. Backend Setup

#### Install Dependencies

```bash
cd backend
npm install
```

#### Configure Environment Variables

Create `.env` file:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/commhub

# Supabase (if using)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# OAuth2 Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Ollama
OLLAMA_HOST=http://localhost:11434

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-service-account@firebase.com

# Server
PORT=3000
NODE_ENV=development
```

#### Run Database Migrations

```bash
# If using Supabase, run via Supabase CLI
npx supabase migration up

# OR using raw SQL
psql -U postgres -d commhub -f ../specs/001-ai-communication-hub/data-model.md
# (Extract SQL from data-model.md)
```

#### Start Development Server

```bash
npm run dev
# Server runs on http://localhost:3000
```

### 3. Flutter App Setup

#### Install Dependencies

```bash
cd myassistanpersonal
flutter pub get
```

#### Configure Firebase

1. Create Firebase project at https://console.firebase.google.com
2. Add Android app (download `google-services.json` → `android/app/`)
3. Add iOS app (download `GoogleService-Info.plist` → `ios/Runner/`)
4. Add web app (copy config to `web/index.html`)

#### Configure Environment

Create `lib/config/env.dart`:

```dart
class Env {
  static const String backendUrl = String.fromEnvironment(
    'BACKEND_URL',
    defaultValue: 'http://localhost:3000/v1',
  );

  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://your-project.supabase.co',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'your-anon-key',
  );
}
```

#### Run Code Generation

```bash
# Generate Riverpod providers and Freezed models
dart run build_runner build --delete-conflicting-outputs
```

#### Start Flutter App

```bash
# Web
flutter run -d chrome --dart-define=BACKEND_URL=http://localhost:3000/v1

# iOS Simulator
flutter run -d ios

# Android Emulator
flutter run -d android
```

### 4. Ollama Setup (Optional for Local Development)

#### Install Ollama

```bash
# macOS
brew install ollama

# Linux
curl https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

#### Pull AI Model

```bash
ollama pull llama3.1:8b
# or
ollama pull mistral:7b
```

#### Start Ollama Server

```bash
ollama serve
# Runs on http://localhost:11434
```

#### Test Ollama

```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1:8b",
  "prompt": "Categorize this email: Meeting at 3pm",
  "stream": false
}'
```

### 5. Verify Setup

#### Check Backend Health

```bash
curl http://localhost:3000/health
# Expected: {"status": "ok", "database": "connected", "ollama": "connected"}
```

#### Run Backend Tests

```bash
cd backend
npm test
```

#### Run Flutter Tests

```bash
cd myassistanpersonal
flutter test
```

## Development Workflow

### 1. Create New Feature Branch

```bash
git checkout -b feature/my-feature-name
```

### 2. Write Tests First (TDD)

**Backend Example**:
```typescript
// backend/tests/unit/services/gmail-sync.test.ts
import { GmailSyncService } from '../../../src/services/gmail-sync';

describe('GmailSyncService', () => {
  it('should fetch new messages since last sync', async () => {
    const service = new GmailSyncService();
    const messages = await service.fetchNewMessages('user-id', lastSyncTime);
    expect(messages).toHaveLength(5);
  });
});
```

**Flutter Example**:
```dart
// myassistanpersonal/test/unit/services/ai/priority_scoring_test.dart
void main() {
  test('should assign high priority to urgent emails', () async {
    final service = PriorityScoringService();
    final message = Message(content: 'URGENT: Server down');
    final score = await service.calculatePriority(message);
    expect(score, greaterThan(80));
  });
}
```

### 3. Implement Feature

Follow the architecture:
- **Backend**: Route → Controller → Service → Repository
- **Flutter**: UI → Provider → Service → Repository

### 4. Run Tests

```bash
# Backend
cd backend && npm test

# Flutter
cd myassistanpersonal && flutter test
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat: add priority scoring for urgent messages"
```

## Common Development Tasks

### Add New OAuth Provider

1. Register app with provider (Google Cloud Console, Azure Portal, etc.)
2. Add credentials to `.env`
3. Create Passport.js strategy in `backend/src/auth/strategies/`
4. Add route in `backend/src/api/auth/`
5. Update Flutter auth service in `myassistanpersonal/lib/services/auth/`

### Add New Message Platform

1. Create platform-specific sync service in `backend/src/services/sync/`
2. Implement OAuth2 flow
3. Add API client for fetching/sending messages
4. Create Flutter service in `myassistanpersonal/lib/services/sync/`
5. Update UI to show platform icon

### Modify Data Model

1. Update schema in `specs/001-ai-communication-hub/data-model.md`
2. Create migration file in `backend/src/db/migrations/`
3. Run migration: `npx supabase migration up`
4. Update TypeScript models in `backend/src/models/`
5. Update Dart models in `myassistanpersonal/lib/models/`
6. Run code generation: `dart run build_runner build`

### Add New AI Feature

1. Design prompt in `backend/src/services/ai/prompts/`
2. Create service method calling Ollama
3. Add API endpoint in `backend/src/api/ai/`
4. Update OpenAPI contract in `specs/001-ai-communication-hub/contracts/ai.yaml`
5. Create Flutter service wrapper
6. Add UI component to display results

## Key Files Reference

### Backend

```
backend/
├── src/
│   ├── api/              # REST API routes
│   │   ├── auth/         # OAuth2 endpoints
│   │   ├── messages/     # Message CRUD
│   │   ├── ai/           # AI services
│   │   └── analytics/    # Analytics
│   ├── services/         # Business logic
│   │   ├── sync/         # Platform synchronization
│   │   ├── ai/           # Ollama integration
│   │   └── oauth/        # OAuth token management
│   ├── models/           # TypeScript data models
│   ├── db/               # Database layer
│   │   ├── migrations/   # SQL migrations
│   │   └── repositories/ # Data access
│   └── server.ts         # Express app entry point
├── tests/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── contract/         # API contract tests
├── .env                  # Environment variables
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript config
```

### Flutter

```
myassistanpersonal/
├── lib/
│   ├── main.dart         # App entry point
│   ├── models/           # Dart data models
│   ├── services/         # Business logic
│   │   ├── auth/         # Authentication
│   │   ├── sync/         # Message sync
│   │   └── ai/           # AI features
│   ├── providers/        # Riverpod state management
│   ├── ui/               # User interface
│   │   ├── screens/      # Full-page views
│   │   └── widgets/      # Reusable components
│   └── config/           # App configuration
├── test/
│   ├── unit/             # Unit tests
│   ├── widget/           # Widget tests
│   └── integration/      # Integration tests
├── pubspec.yaml          # Flutter dependencies
└── analysis_options.yaml # Linter rules
```

## Debugging Tips

### Backend

**Enable verbose logging**:
```bash
DEBUG=* npm run dev
```

**Debug OAuth flow**:
```typescript
// Add to auth callback handler
console.log('OAuth tokens:', { accessToken, refreshToken });
```

**Test Ollama directly**:
```bash
curl -X POST http://localhost:11434/api/generate \
  -d '{"model":"llama3.1:8b","prompt":"test"}'
```

### Flutter

**Enable Riverpod logging**:
```dart
void main() {
  runApp(
    ProviderScope(
      observers: [ProviderLogger()],
      child: MyApp(),
    ),
  );
}
```

**Inspect network calls**:
```dart
// In Dio client configuration
dio.interceptors.add(LogInterceptor(
  requestBody: true,
  responseBody: true,
));
```

**Debug widget tree**:
```dart
// In Flutter DevTools > Widget Inspector
// Or add debugPrint in build methods
```

## Troubleshooting

### "OAuth redirect URI mismatch"

**Solution**: Ensure redirect URI in OAuth provider console matches exactly:
```
http://localhost:3000/v1/auth/gmail/callback
```

### "Database connection failed"

**Solution**: Check DATABASE_URL in `.env` and ensure PostgreSQL is running:
```bash
# Check if PostgreSQL is running
pg_isready

# Restart PostgreSQL
brew services restart postgresql
```

### "Ollama model not found"

**Solution**: Pull the model first:
```bash
ollama pull llama3.1:8b
ollama list  # Verify model is downloaded
```

### "Flutter build_runner conflicts"

**Solution**: Delete generated files and rebuild:
```bash
flutter clean
dart run build_runner build --delete-conflicting-outputs
```

## Next Steps

1. **Complete P1 (MVP)**:
   - Implement Gmail OAuth2 flow
   - Build unified inbox UI
   - Integrate Ollama for priority scoring
   - Set up FCM push notifications

2. **Testing**:
   - Write unit tests for all services
   - Create integration tests for API endpoints
   - Add widget tests for critical UI components

3. **Documentation**:
   - Document API endpoints in Swagger UI
   - Create user guides for features
   - Write deployment guide

4. **Deployment**:
   - Deploy backend to cloud provider (Heroku, AWS, GCP)
   - Deploy Ollama to GPU VPS
   - Build Flutter web app and host on Vercel/Netlify
   - Submit mobile apps to App Store / Play Store

## Resources

- **Feature Specification**: [spec.md](./spec.md)
- **Implementation Plan**: [plan.md](./plan.md)
- **Research Findings**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contracts**: [contracts/](./contracts/)
- **Flutter Documentation**: https://flutter.dev/docs
- **Riverpod Guide**: https://riverpod.dev
- **Supabase Docs**: https://supabase.com/docs
- **Ollama Documentation**: https://ollama.ai/docs

## Support

- **GitHub Issues**: <repository-url>/issues
- **Team Chat**: #communication-hub on Slack
- **Code Reviews**: Create PR and tag reviewers

---

**Happy coding!** If you encounter issues not covered in this guide, please update this document or reach out to the team.
