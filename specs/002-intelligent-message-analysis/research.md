# Research: Intelligent Message Analysis and Homepage Redesign

**Feature**: 002-intelligent-message-analysis
**Date**: 2025-11-19
**Status**: Complete

## Overview

This document consolidates research findings for implementing AI-powered message analysis with spam detection, response necessity detection, and auto-reply generation using the existing Ollama AI integration.

## Research Areas

### 1. Ollama AI Integration for Message Analysis

**Decision**: Use existing Ollama client with structured prompts for spam detection, sentiment analysis, and reply generation

**Rationale**:
- Ollama is already integrated and operational in the codebase
- Provides local/private AI processing (no external API calls)
- Supports multiple open-source models suitable for text analysis
- Can handle all three analysis tasks (spam, sentiment, reply generation) with appropriate prompting

**Alternatives Considered**:
- OpenAI API: Rejected due to external dependency, cost, and privacy concerns
- Google Gemini API: Rejected for same reasons as OpenAI
- Rule-based spam detection: Rejected as insufficient for accuracy requirements (>90%)

**Implementation Approach**:
- Spam detection: Use Ollama with classification prompt returning probability score
- Sentiment analysis: Use Ollama to classify as positive/neutral/negative
- Response necessity: Use Ollama to analyze message content and determine if reply needed
- Reply generation: Use Ollama with context-aware prompt to generate professional replies

**Best Practices**:
- Structure prompts with clear instructions and expected output format
- Include examples in prompts for few-shot learning
- Set temperature parameter appropriately (lower for classification, higher for generation)
- Implement fallback behavior if Ollama is unavailable
- Cache analysis results to avoid re-analyzing same messages

### 2. MongoDB Schema Design for Message Analysis

**Decision**: Create separate MessageAnalysis collection with reference to Message ID

**Rationale**:
- Separation of concerns: analysis data separate from message data
- Allows re-analysis without modifying original messages
- Supports analysis versioning for model improvements
- Enables efficient querying of analyzed vs unanalyzed messages

**Alternatives Considered**:
- Embedding analysis in Message document: Rejected due to tight coupling and schema pollution
- Storing in separate database: Rejected as unnecessarily complex for current scale

**Schema Structure**:
```typescript
MessageAnalysis {
  messageId: ObjectId (indexed, reference to Message)
  analysisTimestamp: Date
  spamProbability: Number (0-100)
  isSpam: Boolean
  needsResponse: Boolean
  responseConfidence: Number (0-100)
  sentiment: String (enum: positive/neutral/negative)
  priorityLevel: String (enum: high/medium/low)
  generatedReplyText: String (optional)
  analysisVersion: String
}
```

**Best Practices**:
- Index messageId for fast lookups
- Index isSpam and needsResponse for filtered queries
- Use TTL index for automatic cleanup of old analysis data (90 days)
- Validate enum values at schema level with Mongoose

### 3. UserSettings Storage Pattern

**Decision**: Create UserSettings collection with one document per user

**Rationale**:
- User-specific configuration requires dedicated collection
- Settings may grow over time (new automation options)
- Easier to query and update than embedding in User document
- Supports atomic updates for individual settings

**Alternatives Considered**:
- Embedding in User collection: Rejected due to potential User schema bloat
- Key-value store (Redis): Rejected as overkill for current scale

**Schema Structure**:
```typescript
UserSettings {
  userId: ObjectId (unique index)
  autoDeleteSpamEnabled: Boolean (default: false)
  autoSendRepliesEnabled: Boolean (default: false)
  autoReplyConditions: {
    senderWhitelist: [String]
    senderBlacklist: [String]
    businessHoursOnly: Boolean (default: false)
    maxRepliesPerDay: Number (default: 10)
  }
  spamThreshold: Number (default: 80)
  responseConfidenceThreshold: Number (default: 85)
  lastUpdated: Date
}
```

**Best Practices**:
- Unique index on userId
- Provide sensible defaults for all settings
- Atomic updates using Mongoose findOneAndUpdate
- Validate ranges (e.g., thresholds must be 0-100)

### 4. Flutter State Management for Services Page

**Decision**: Use StatefulWidget with Timer for auto-refresh functionality

**Rationale**:
- Simple and sufficient for Services page requirements
- No need for complex state management (Provider/Riverpod) for this isolated feature
- Timer.periodic provides reliable 30-second auto-refresh
- Follows existing Flutter patterns in codebase

**Alternatives Considered**:
- Provider package: Rejected as overkill for single-page state
- StreamBuilder with periodic stream: Rejected as more complex than Timer

**Implementation Pattern**:
```dart
class _ServicesScreenState extends State<ServicesScreen> {
  Timer? _refreshTimer;
  ServicesHealthResponse? _servicesHealth;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadServicesHealth();
    _refreshTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _loadServicesHealth(),
    );
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }
}
```

**Best Practices**:
- Always cancel Timer in dispose() to prevent memory leaks
- Check mounted before setState after async operations
- Provide RefreshIndicator for manual refresh
- Show loading state during initial fetch

### 5. API Contract Design for Analysis Endpoints

**Decision**: RESTful endpoints with JSON responses following existing API patterns

**Rationale**:
- Consistency with existing backend API structure
- Simple request/response model suitable for analysis operations
- Easy to test and document with OpenAPI

**Endpoint Design**:
- GET /api/v1/messages/:id/analysis - Retrieve analysis for specific message
- POST /api/v1/messages/:id/analyze - Trigger analysis for message
- GET /api/v1/services/health - Service health status (already implemented)

**Response Format**:
```json
{
  "success": true,
  "data": {
    "messageId": "507f1f77bcf86cd799439011",
    "analysis": {
      "spamProbability": 95,
      "isSpam": true,
      "needsResponse": false,
      "sentiment": "negative",
      "priorityLevel": "low"
    },
    "timestamp": "2025-11-19T10:30:00Z"
  }
}
```

**Best Practices**:
- Consistent error response format across all endpoints
- Include timestamps for cache validation
- Use HTTP status codes appropriately (200, 201, 404, 500)
- Require authentication for all endpoints
- Validate request parameters and return 400 for invalid input

### 6. Performance Optimization Strategies

**Decision**: Implement caching and batch analysis

**Rationale**:
- Message analysis can be expensive (AI model inference)
- Results are deterministic for same message content
- Multiple messages may arrive at once during sync

**Optimization Approaches**:

1. **Result Caching**:
   - Store analysis results in MongoDB
   - Check for existing analysis before triggering new analysis
   - Only re-analyze if message content changed or analysis version updated

2. **Batch Processing**:
   - Queue multiple messages for analysis
   - Process in batches to optimize Ollama inference
   - Implement background job for analysis (don't block sync)

3. **Lazy Loading**:
   - Load analysis data only when dashboard is viewed
   - Paginate message lists with analysis badges
   - Use virtual scrolling for large message lists in Flutter

**Best Practices**:
- Set 5-second timeout for analysis operations
- Implement circuit breaker for Ollama failures
- Monitor analysis throughput and queue depth
- Use database indexes for fast analysis lookups

### 7. Error Handling and Graceful Degradation

**Decision**: Analysis features degrade gracefully when Ollama unavailable

**Rationale**:
- Ollama service may be temporarily offline
- Core messaging functionality must remain available
- Users should still be able to view and manage messages

**Degradation Strategy**:
- If Ollama offline: Display "Analysis unavailable" badge
- If analysis fails: Allow manual spam marking and reply composition
- If auto-actions enabled but Ollama down: Disable automation, notify user
- Retry failed analysis on next sync cycle

**Best Practices**:
- Implement health check before attempting analysis
- Log all analysis errors with context
- Display clear user-facing error messages
- Provide manual alternatives for all automated features

## Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Backend API | Node.js + TypeScript | Current | REST API server |
| Backend Framework | Express.js | Current | HTTP routing |
| Backend Database | MongoDB + Mongoose | Current | Data persistence |
| AI Engine | Ollama | Current | Message analysis |
| Frontend Framework | Flutter | 3.x | Cross-platform UI |
| Frontend Language | Dart | 3.x | Application logic |
| State Management | StatefulWidget + Timer | Built-in | Services page refresh |
| HTTP Client | http package | Current | API communication |
| Serialization | freezed + json_serializable | Current | Model generation |

## Open Questions

None. All technical decisions have been made based on existing architecture and requirements.

## Next Steps

Proceed to Phase 1: Design & Contracts
- Create data-model.md with detailed entity specifications
- Generate OpenAPI contracts in /contracts/ directory
- Create quickstart.md for user-facing documentation
- Update agent context with new technologies (if any)
