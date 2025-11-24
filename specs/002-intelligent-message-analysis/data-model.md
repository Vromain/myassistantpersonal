# Data Model: Intelligent Message Analysis

**Feature**: 002-intelligent-message-analysis
**Date**: 2025-11-19
**Status**: Complete

## Overview

This document defines the data entities, schemas, and relationships for the intelligent message analysis feature. The model supports AI-powered spam detection, response necessity analysis, sentiment classification, and user automation preferences.

## Entity Relationship Diagram

```
User (existing)
  │
  ├── 1:1 ──> UserSettings
  │
  └── 1:N ──> Message (existing)
                 │
                 └── 1:1 ──> MessageAnalysis
```

## Entities

### 1. MessageAnalysis

Stores AI analysis results for individual messages.

#### MongoDB Schema (Mongoose)

```typescript
interface IMessageAnalysis extends Document {
  // Reference
  messageId: mongoose.Types.ObjectId;

  // Analysis metadata
  analysisTimestamp: Date;
  analysisVersion: string;

  // Spam detection
  spamProbability: number;  // 0-100%
  isSpam: boolean;

  // Response necessity
  needsResponse: boolean;
  responseConfidence: number;  // 0-100%

  // Sentiment analysis
  sentiment: 'positive' | 'neutral' | 'negative';

  // Priority classification
  priorityLevel: 'high' | 'medium' | 'low';

  // Generated reply (if needsResponse = true)
  generatedReplyText?: string;
}

const MessageAnalysisSchema = new Schema<IMessageAnalysis>({
  messageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
    index: true,
    unique: true
  },
  analysisTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  analysisVersion: {
    type: String,
    required: true,
    default: '1.0.0'
    // Tracks analysis algorithm version for quality improvements
    // Use cases:
    // - Re-analyze messages when algorithm improves (version bump)
    // - Compare accuracy across algorithm versions
    // - Support A/B testing of analysis approaches
    // Increment when: Prompt engineering changes, model upgrades, or logic improvements
  },
  spamProbability: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  isSpam: {
    type: Boolean,
    required: true,
    index: true
  },
  needsResponse: {
    type: Boolean,
    required: true,
    index: true
  },
  responseConfidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    required: true
  },
  priorityLevel: {
    type: String,
    enum: ['high', 'medium', 'low'],
    required: true
  },
  generatedReplyText: {
    type: String,
    required: false
  }
}, {
  timestamps: true,
  collection: 'message_analyses'
});

// TTL index for auto-cleanup after 90 days
MessageAnalysisSchema.index(
  { analysisTimestamp: 1 },
  { expireAfterSeconds: 7776000 }  // 90 days
);
```

#### Validation Rules

- `spamProbability`: Must be 0-100
- `responseConfidence`: Must be 0-100
- `sentiment`: Must be one of: positive, neutral, negative
- `priorityLevel`: Must be one of: high, medium, low
- `isSpam`: Auto-set to true if spamProbability >= 80 (default threshold)
- `generatedReplyText`: Required if needsResponse = true

#### State Transitions

```
Message Created
    ↓
Analysis Triggered
    ↓
Ollama Processing
    ↓
Analysis Saved
    ↓ (if auto-delete enabled && isSpam)
Message Moved to Trash
    ↓ (if auto-reply enabled && needsResponse)
Reply Sent
```

### 2. UserSettings

Stores user preferences for auto-delete and auto-reply features.

#### MongoDB Schema (Mongoose)

```typescript
interface IAutoReplyConditions {
  senderWhitelist: string[];
  senderBlacklist: string[];
  businessHoursOnly: boolean;
  maxRepliesPerDay: number;
}

interface IUserSettings extends Document {
  // Reference
  userId: mongoose.Types.ObjectId;

  // Auto-delete configuration
  autoDeleteSpamEnabled: boolean;
  spamThreshold: number;  // 0-100%, default 80

  // Auto-reply configuration
  autoSendRepliesEnabled: boolean;
  responseConfidenceThreshold: number;  // 0-100%, default 85
  autoReplyConditions: IAutoReplyConditions;

  // Metadata
  lastUpdated: Date;
}

const UserSettingsSchema = new Schema<IUserSettings>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  autoDeleteSpamEnabled: {
    type: Boolean,
    required: true,
    default: false
  },
  spamThreshold: {
    type: Number,
    required: true,
    default: 80,
    min: 0,
    max: 100
  },
  autoSendRepliesEnabled: {
    type: Boolean,
    required: true,
    default: false
  },
  responseConfidenceThreshold: {
    type: Number,
    required: true,
    default: 85,
    min: 0,
    max: 100
  },
  autoReplyConditions: {
    senderWhitelist: {
      type: [String],
      default: []
    },
    senderBlacklist: {
      type: [String],
      default: []
    },
    businessHoursOnly: {
      type: Boolean,
      default: false
    },
    maxRepliesPerDay: {
      type: Number,
      default: 10,
      min: 1,
      max: 100
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'user_settings'
});

// Update lastUpdated on save
UserSettingsSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});
```

#### Validation Rules

- `spamThreshold`: Must be 0-100, default 80
- `responseConfidenceThreshold`: Must be 0-100, default 85
- `autoReplyConditions.maxRepliesPerDay`: Must be 1-100, default 10
- `autoReplyConditions.senderWhitelist`: Array of valid email addresses
- `autoReplyConditions.senderBlacklist`: Array of valid email addresses

#### Business Rules

1. **Auto-Delete Spam**:
   - Only executes if `autoDeleteSpamEnabled = true`
   - Message deleted if `analysis.spamProbability >= spamThreshold`
   - Deleted messages moved to Trash, not permanently deleted
   - Trash retention period: 30 days

2. **Auto-Send Reply**:
   - Only executes if `autoSendRepliesEnabled = true`
   - Reply sent if `analysis.needsResponse = true AND analysis.responseConfidence >= responseConfidenceThreshold`
   - Additional conditions checked:
     - Sender not in blacklist
     - If whitelist non-empty, sender must be in whitelist
     - If `businessHoursOnly = true`, current time must be M-F 9am-5pm user timezone
     - Daily reply count < `maxRepliesPerDay`

### 3. ServiceHealth (Interface, not persisted)

Runtime representation of service health status.

#### TypeScript Interface

```typescript
interface IBackendServiceHealth {
  serviceName: 'Backend API';
  status: 'online' | 'offline' | 'degraded';
  endpoint: string;
  responseTime: number;  // milliseconds
  lastCheckTimestamp: Date;
  errorMessage?: string;
}

interface IOllamaServiceHealth {
  serviceName: 'Ollama AI';
  status: 'online' | 'offline' | 'degraded';
  endpoint?: string;
  lastCheckTimestamp: Date;
  errorMessage?: string;
  metadata?: {
    modelName: string;
    availableModels: string[];
    failureCount: number;
  };
}

interface IServicesHealth {
  backend: IBackendServiceHealth;
  ollama: IOllamaServiceHealth;
}
```

#### Flutter Model (Dart with Freezed)

```dart
enum ServiceStatus { online, offline, degraded }

@freezed
class ServiceHealth with _$ServiceHealth {
  const ServiceHealth._();

  const factory ServiceHealth({
    required String serviceName,
    required ServiceStatus status,
    String? endpoint,
    int? responseTime,
    required DateTime lastCheckTimestamp,
    String? errorMessage,
    Map<String, dynamic>? metadata,
  }) = _ServiceHealth;

  factory ServiceHealth.fromJson(Map<String, dynamic> json) =>
      _$ServiceHealthFromJson(json);

  // Computed properties
  bool get isOnline => status == ServiceStatus.online;
  bool get isOffline => status == ServiceStatus.offline;
  bool get isDegraded => status == ServiceStatus.degraded;

  String get statusDisplay {
    switch (status) {
      case ServiceStatus.online: return 'En ligne';
      case ServiceStatus.offline: return 'Hors ligne';
      case ServiceStatus.degraded: return 'Dégradé';
    }
  }

  String get statusIcon {
    switch (status) {
      case ServiceStatus.online: return '✅';
      case ServiceStatus.offline: return '❌';
      case ServiceStatus.degraded: return '⚠️';
    }
  }
}
```

## Indexes

### MessageAnalysis Collection

```typescript
// Primary lookup by messageId
{ messageId: 1 }  // unique

// Filter by spam status
{ isSpam: 1 }

// Filter by response necessity
{ needsResponse: 1 }

// TTL for auto-cleanup after 90 days
{ analysisTimestamp: 1 }  // expireAfterSeconds: 7776000

// Compound index for dashboard queries
{ isSpam: 1, needsResponse: 1, analysisTimestamp: -1 }
```

### UserSettings Collection

```typescript
// Primary lookup by userId
{ userId: 1 }  // unique
```

## Data Flow

### Message Analysis Flow

```
1. Message arrives via sync
   ↓
2. Check if MessageAnalysis exists for messageId
   ↓ (if not exists)
3. Queue message for analysis
   ↓
4. Call OllamaClient for spam, sentiment, response detection
   ↓
5. Generate reply if needsResponse = true
   ↓
6. Save MessageAnalysis to MongoDB
   ↓
7. Check UserSettings for auto-actions
   ↓ (if autoDeleteSpamEnabled && isSpam)
8a. Move message to Trash
   ↓ (if autoSendRepliesEnabled && needsResponse)
8b. Send auto-reply
```

### Settings Update Flow

```
1. User modifies settings in Settings screen
   ↓
2. Flutter sends PUT /api/v1/settings
   ↓
3. Backend validates settings
   ↓
4. Update UserSettings document
   ↓
5. Return updated settings
   ↓
6. Flutter updates local state
```

## Migration Strategy

### Existing Data

No migration required for existing entities:
- `User` collection: No changes
- `Message` collection: No changes

### New Collections

Create with initial data:
- `message_analyses`: Empty initially, populated as messages are analyzed
- `user_settings`: Create default document for each existing user

### Migration Script

```typescript
// Create default UserSettings for existing users
async function migrateUserSettings() {
  const users = await User.find({});

  for (const user of users) {
    const existingSettings = await UserSettings.findOne({ userId: user._id });

    if (!existingSettings) {
      await UserSettings.create({
        userId: user._id,
        autoDeleteSpamEnabled: false,
        spamThreshold: 80,
        autoSendRepliesEnabled: false,
        responseConfidenceThreshold: 85,
        autoReplyConditions: {
          senderWhitelist: [],
          senderBlacklist: [],
          businessHoursOnly: false,
          maxRepliesPerDay: 10
        }
      });
    }
  }
}
```

## Data Retention

- **MessageAnalysis**: 90 days (TTL index)
- **UserSettings**: Indefinite (deleted when user deleted)
- **ServiceHealth**: Not persisted (runtime only)

## Privacy & Security

- MessageAnalysis data encrypted at rest (MongoDB encryption)
- No message content stored in analysis (only results)
- Generated replies do not include sensitive original message data
- UserSettings accessible only by authenticated user
- All API endpoints require authentication

## Performance Considerations

- MessageAnalysis indexed by messageId for O(1) lookups
- Compound index on (isSpam, needsResponse) for filtered dashboard queries
- TTL index automatically removes old analysis data
- ServiceHealth not persisted to avoid database overhead for high-frequency checks
