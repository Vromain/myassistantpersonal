# AI-Powered Communication Hub - Implementation Guide

**Feature**: 001-ai-communication-hub
**Status**: Ready for implementation
**Last Updated**: 2025-11-16

## Prerequisites Check

Before starting implementation, ensure you have:

- [ ] **Flutter SDK 3.16+** installed and in PATH
  ```bash
  flutter --version
  # Should show Flutter 3.16.0 or higher
  ```

- [ ] **Node.js 20.x LTS** installed
  ```bash
  node --version
  # Should show v20.x.x
  ```

- [ ] **Dart 3.x** (comes with Flutter)
  ```bash
  dart --version
  ```

- [ ] **MongoDB** access (local or cloud like MongoDB Atlas)
  - Connection string ready
  - Database created

- [ ] **Ollama** running locally
  ```bash
  curl http://localhost:11434/api/tags
  # Should return list of models
  ```

- [ ] **Git** initialized in project
  ```bash
  git status
  ```

## Quick Start Implementation

### Step 1: Initialize Flutter App (T001-T005)

```bash
# Navigate to project directory
cd /Users/romainvillaume/Documents/projets

# Create Flutter project
flutter create --platforms=web,ios,android myassistanpersonal

# Navigate into project
cd myassistanpersonal

# Verify Flutter setup
flutter doctor
```

### Step 2: Configure Flutter Dependencies (T002)

Edit `myassistanpersonal/pubspec.yaml`:

```yaml
name: myassistanpersonal
description: AI-Powered Communication Hub
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # State Management
  flutter_riverpod: ^2.4.0
  riverpod_annotation: ^2.3.0

  # Local Storage
  sqflite: ^2.3.0
  flutter_secure_storage: ^9.0.0
  path_provider: ^2.1.1

  # Email Integration
  googleapis: ^13.1.0
  google_sign_in: ^6.1.5
  enough_mail: ^2.1.7

  # HTTP & API
  dio: ^5.4.0
  http: ^1.1.0

  # Models & Serialization
  freezed_annotation: ^2.4.1
  json_annotation: ^4.8.1

  # UI
  fl_chart: ^0.65.0

dev_dependencies:
  flutter_test:
    sdk: flutter

  # Code Generation
  build_runner: ^2.4.6
  freezed: ^2.4.5
  json_serializable: ^6.7.1
  riverpod_generator: ^2.3.5

  # Linting
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
```

Then run:
```bash
flutter pub get
```

### Step 3: Create Flutter Folder Structure (T003)

```bash
mkdir -p lib/{models,services/{auth,sync,ai,storage,notifications},ui/{screens,widgets,theme},state,config}
mkdir -p test/{unit/{models,services,state},widget/ui,integration}
```

### Step 4: Initialize Backend API (T006-T008)

```bash
# From project root
cd /Users/romainvillaume/Documents/projets/myassistanpersonal

# Create backend directory
mkdir backend
cd backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express mongoose passport passport-google-oauth20 jsonwebtoken bcrypt dotenv cors helmet express-rate-limit
npm install --save-dev typescript @types/node @types/express @types/passport @types/jsonwebtoken ts-node nodemon jest @types/jest supertest @types/supertest

# Initialize TypeScript
npx tsc --init

# Create folder structure
mkdir -p src/{api/{auth,messages,ai,analytics,notifications},services/{auth,sync,ai,notifications},models,db,middleware}
mkdir -p tests/{unit,integration,contract}
```

### Step 5: Configure TypeScript (T006)

Edit `backend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### Step 6: Environment Configuration

Create `backend/.env`:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/commhub
# Or MongoDB Atlas: mongodb+srv://user:pass@cluster.mongodb.net/commhub

# Ollama
OLLAMA_LOCAL_URL=http://localhost:11434
OLLAMA_REMOTE_URL=http://94.23.49.185:11434

# OAuth2 - Gmail
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/gmail/callback

# JWT
JWT_SECRET=your-super-secret-key-min-32-characters-long
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development
```

Create `myassistanpersonal/lib/config/env.dart`:

```dart
class Env {
  static const String backendUrl = String.fromEnvironment(
    'BACKEND_URL',
    defaultValue: 'http://localhost:3000',
  );

  static const String ollamaLocalUrl = String.fromEnvironment(
    'OLLAMA_LOCAL_URL',
    defaultValue: 'http://localhost:11434',
  );

  static const String ollamaRemoteUrl = String.fromEnvironment(
    'OLLAMA_REMOTE_URL',
    defaultValue: 'http://94.23.49.185:11434',
  );
}
```

## Implementation Checklist

### Phase 1: Setup (8 tasks)

- [ ] T001 Create Flutter project at myassistanpersonal/
- [ ] T002 Configure pubspec.yaml with dependencies
- [ ] T003 Set up Flutter folder structure
- [ ] T004 Create env.dart configuration
- [ ] T005 Configure analysis_options.yaml
- [ ] T006 Initialize Node.js backend with TypeScript
- [ ] T007 Configure backend package.json
- [ ] T008 Create backend folder structure

### Phase 2: Foundation (12 tasks)

#### Database & Models (T009-T013)
- [ ] T009 Set up MongoDB connection
- [ ] T010 Create User model
- [ ] T011 Create ConnectedAccount model
- [ ] T012 Create Message model
- [ ] T013 Create Category model

#### Authentication & Security (T014-T017)
- [ ] T014 Implement JWT authentication middleware
- [ ] T015 Implement Passport.js Gmail OAuth2 strategy
- [ ] T016 Create OAuth callback handler
- [ ] T017 Implement secure token storage

#### Ollama Integration (T018-T020)
- [ ] T018 Create Ollama client service
- [ ] T019 Implement Ollama health check
- [ ] T020 Configure Ollama model selection

### Phase 3: User Story 1 - Unified Inbox (18 tasks)

See detailed tasks in [tasks.md](specs/001-ai-communication-hub/tasks.md)

## Next Steps

1. **Verify Prerequisites**: Ensure all tools are installed
2. **Follow Setup Guide**: Complete Phase 1 tasks (T001-T008)
3. **Implement Foundation**: Complete Phase 2 tasks (T009-T020)
4. **Build MVP**: Complete Phase 3 tasks (T021-T038)
5. **Test End-to-End**: Verify Gmail integration and AI prioritization working

## Reference Documentation

- **Full Task List**: [specs/001-ai-communication-hub/tasks.md](specs/001-ai-communication-hub/tasks.md)
- **Technical Plan**: [specs/001-ai-communication-hub/plan.md](specs/001-ai-communication-hub/plan.md)
- **Data Models**: [specs/001-ai-communication-hub/data-model.md](specs/001-ai-communication-hub/data-model.md)
- **API Contracts**: [specs/001-ai-communication-hub/contracts/](specs/001-ai-communication-hub/contracts/)
- **Quick Start**: [specs/001-ai-communication-hub/quickstart.md](specs/001-ai-communication-hub/quickstart.md)

## Estimated Timeline

- **Phase 1 (Setup)**: 1-2 days
- **Phase 2 (Foundation)**: 3-4 days
- **Phase 3 (MVP - US1)**: 5-7 days
- **Total MVP**: 2-3 weeks for 1 developer

## Support

For questions or issues during implementation:
1. Check the quickstart guide
2. Review API contracts for endpoint specifications
3. Consult data-model.md for database schema
4. See research.md for technology decisions

---

**Ready to start?** Begin with Phase 1, Task T001 above!
