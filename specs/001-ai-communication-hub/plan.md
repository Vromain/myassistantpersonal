# Implementation Plan: AI-Powered Communication Hub

**Branch**: `001-ai-communication-hub` | **Date**: 2025-11-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ai-communication-hub/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a cross-platform (web and mobile) communication hub that unifies email, social networks, and instant messaging into a single interface with AI-powered message prioritization, smart replies, and automated management. The application uses Flutter for unified web/mobile development and integrates Ollama for local AI processing of spam detection, automatic responses, and intelligent scheduling.

## Technical Context

**Language/Version**: Dart 3.x with Flutter 3.x for cross-platform UI (web, iOS, Android)
**Primary Dependencies**:
- Flutter SDK (cross-platform framework)
- Ollama for local AI processing (priority scoring, reply generation, categorization, spam detection)
- OAuth2 libraries for Flutter (for Gmail, Exchange, Facebook, Instagram, WhatsApp, TikTok authentication)
- Platform-specific email/messaging SDKs: specific packages for Gmail API, Exchange/IMAP, social media APIs, WhatsApp Business API, etc.
- State management: Riverpod,
- Backend API framework:(Node.js/Express for handling OAuth flows and message sync)

**Storage**:
- Local: SQLite (via sqflite package) for offline message caching and user preferences
- Cloud: MongoDB for synchronized data across devices)
- Secure storage: flutter_secure_storage for OAuth tokens and credentials (AES-256 encryption)

**Testing**:
- Flutter test framework (unit tests)
- Integration tests (flutter_driver or integration_test package)
- Widget tests for UI components
- E2E testing strategy for OAuth flows and API integrations

**Target Platform**: Web (Chrome, Safari, Firefox), iOS 14+, Android 8.0+ (API level 26+)

**Project Type**: Mobile + Web (Flutter cross-platform with backend API)

**Performance Goals**:
- Message sync latency <60 seconds for 95% of messages
- UI response time <2 seconds for user interactions
- Mobile app load time <3 seconds on 4G/LTE
- Search query response <1 second for databases up to 10,000 messages
- AI processing (priority scoring, reply generation) <3 seconds per request
- Support 1,000 concurrent users without degradation

**Constraints**:
- Offline-capable: recent messages cached locally, outbound messages queued
- Flutter package compatibility: all dependencies must support web, iOS, and Android
- API rate limits: must handle rate limiting from third-party platforms (Gmail, Facebook, etc.)
- : Ollama deployment strategy localy on http://localhost:11434/ and server hoted on http://94.23.49.185:11434/
-  Push notification service  APNs

**Scale/Scope**:
- Target: 1,000 concurrent users initially (SC-005)
- Up to 5 connected accounts per user (10 for premium) (FR-030)
- 10,000+ messages per user supported
- 90-day default message retention (FR-029)
- Multi-platform: 3 platforms (web, iOS, Android) with feature parity

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Simplicity First
- ✅ **PASS**: Starting with Flutter (single codebase for web/mobile) instead of separate native apps
- ⚠️ **REVIEW NEEDED**: Multiple third-party integrations (Gmail, Exchange, IMAP, Facebook, Instagram, WhatsApp, TikTok, Outlook) adds complexity
  - **Justification**: Required by core product value proposition (FR-001 through FR-003). Cannot deliver unified communication hub without these integrations.
  - **Mitigation**: Implement incremental delivery (P1 starts with email only, social networks added in P2+)
- ✅ **PASS**: Using established patterns (OAuth2 for auth, REST APIs for integrations)
- ⚠️ **REVIEW NEEDED**: Ollama AI integration adds deployment complexity
  - **Justification**: AI-powered features (priority scoring, smart replies, spam detection) are core differentiators (FR-006, FR-010, FR-012)
  - **Simpler alternative considered**: Cloud AI APIs (OpenAI, Anthropic) - rejected due to privacy concerns and cost at scale

### II. Test-Driven Development
- ✅ **PASS**: TDD cycle required for all business logic
- ✅ **PASS**: Integration tests required for OAuth flows (critical dependency)
- ✅ **PASS**: Contract tests required for third-party API integrations
- ⚠️ **CHALLENGE**: Mocking third-party APIs (Gmail, Facebook, etc.) for testing requires research
  - **Action**: Phase 0 research must identify testing strategies for external integrations

### III. Documentation as Code
- ✅ **PASS**: API contracts required in /contracts/ directory
- ✅ **PASS**: Architecture decisions documented in plan.md
- ✅ **PASS**: User-facing features documented in quickstart.md
- ✅ **PASS**: Public APIs for all third-party integrations must be documented

### IV. Incremental Delivery
- ✅ **PASS**: Five independent user stories prioritized P1-P5
- ✅ **PASS**: P1 (Unified Inbox) can be tested with single email account
- ✅ **PASS**: P2 (Smart Replies) builds on P1 without blocking it
- ✅ **PASS**: Each story delivers standalone user value
- ✅ **PASS**: Lower priority stories (P3-P5) can be deferred

### V. Security by Default
- ✅ **PASS**: OAuth2 required for all third-party authentication (FR-001 through FR-003)
- ✅ **PASS**: AES-256 encryption for stored credentials (FR-020)
- ✅ **PASS**: TLS 1.3 for data in transit (spec assumption)
- ✅ **PASS**: Input validation required for all user data
- ✅ **PASS**: Secure token storage via flutter_secure_storage
- ⚠️ **REVIEW NEEDED**: Handling sensitive message content requires careful design
  - **Action**: Phase 1 must document data encryption strategy for message storage
- ✅ **PASS**: User data deletion supported (FR-021)

### Overall Gate Status (Pre-Design): ⚠️ **CONDITIONAL PASS**

**Violations requiring justification**:
1. High integration complexity (8+ third-party platforms)
2. Ollama AI deployment complexity

**Conditions for proceeding to Phase 0**:
- ✅ Complexity justified by core product requirements
- ✅ Mitigation strategy defined (incremental delivery, research phase for unknowns)
- ✅ Security requirements clearly defined
- ✅ Research phase resolved all NEEDS CLARIFICATION items

---

## Constitution Check (Post-Design - Phase 1 Complete)

*Re-evaluation after completing data model, API contracts, and quickstart guide*

### I. Simplicity First
- ✅ **PASS**: Data model uses normalized PostgreSQL schema (standard, well-understood)
- ✅ **PASS**: API follows REST conventions (standard HTTP methods, predictable endpoints)
- ✅ **PASS**: Research recommended deferring complex integrations (Facebook, Instagram, WhatsApp, TikTok) to later phases
- ✅ **PASS**: Technology stack uses proven, mainstream choices (Flutter, Node.js, PostgreSQL)
- ✅ **PASS**: Avoided premature optimization (no caching layers, no microservices, single backend)
- ✅ **CONFIRMED**: Complexity justified in Complexity Tracking table remains valid

### II. Test-Driven Development
- ✅ **PASS**: API contracts defined (OpenAPI 3.0) enable contract testing with Pact
- ✅ **PASS**: Quickstart guide includes TDD examples for backend (Jest) and Flutter (flutter test)
- ✅ **PASS**: Research identified testing strategies (mock OAuth servers, VCR pattern for APIs)
- ✅ **PASS**: Data model includes validation rules that can be tested
- ✅ **PASS**: All major services have clear interfaces suitable for mocking

### III. Documentation as Code
- ✅ **PASS**: API contracts documented in OpenAPI format (machine-readable)
- ✅ **PASS**: Data model documented with field descriptions, relationships, indexes
- ✅ **PASS**: Quickstart guide created for developer onboarding
- ✅ **PASS**: Research findings documented with decisions and rationale
- ✅ **PASS**: README.md created for contracts directory explaining usage
- ✅ **PASS**: All documentation co-located with feature in specs/001-ai-communication-hub/

### IV. Incremental Delivery
- ✅ **PASS**: P1 focuses on Gmail + IMAP integration only (confirmed in research.md)
- ✅ **PASS**: Social media platforms explicitly deferred to P3 (research recommendations)
- ✅ **PASS**: WhatsApp deferred to P4 due to complexity
- ✅ **PASS**: TikTok excluded entirely (no API available)
- ✅ **PASS**: Each API endpoint maps to specific functional requirements
- ✅ **PASS**: Data model supports phased rollout (platform field is enum, easily extended)

### V. Security by Default
- ✅ **PASS**: OAuth2 tokens stored securely in backend (not exposed to Flutter client)
- ✅ **PASS**: API requires Bearer authentication for all endpoints except /auth/*
- ✅ **PASS**: Data model includes Row Level Security (RLS) policies for Supabase
- ✅ **PASS**: Sensitive fields encrypted (oauth_tokens, documented in data-model.md)
- ✅ **PASS**: Rate limiting defined in API contracts (429 responses)
- ✅ **PASS**: Input validation enforced via OpenAPI schemas (string lengths, patterns, enums)
- ✅ **PASS**: Message encryption strategy documented (AES-256 at rest, TLS 1.3 in transit)

### Overall Gate Status (Post-Design): ✅ **PASS**

**Phase 1 Design Complete**:
- ✅ All NEEDS CLARIFICATION items resolved in research.md
- ✅ Data model designed with 7 entities, relationships, indexes
- ✅ API contracts created with 9 OpenAPI files covering all endpoints
- ✅ Quickstart guide created for developer onboarding
- ✅ Agent context updated with new technologies
- ✅ No new constitutional violations introduced
- ✅ All complexity justified and documented

**Ready to proceed to Phase 2**: Generate tasks.md for implementation

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Flutter cross-platform application + Backend API

# Flutter app (web, iOS, Android)
myassistanpersonal/
├── lib/
│   ├── main.dart                      # App entry point
│   ├── models/                        # Data models
│   │   ├── message.dart
│   │   ├── connected_account.dart
│   │   ├── user.dart
│   │   ├── category.dart
│   │   └── notification.dart
│   ├── services/                      # Business logic
│   │   ├── auth/                      # OAuth2 flows
│   │   │   ├── gmail_auth.dart
│   │   │   ├── exchange_auth.dart
│   │   │   ├── facebook_auth.dart
│   │   │   ├── instagram_auth.dart
│   │   │   ├── whatsapp_auth.dart
│   │   │   └── tiktok_auth.dart
│   │   ├── sync/                      # Message synchronization
│   │   │   ├── email_sync.dart
│   │   │   ├── social_sync.dart
│   │   │   └── messaging_sync.dart
│   │   ├── ai/                        # Ollama integration
│   │   │   ├── priority_scoring.dart
│   │   │   ├── reply_generation.dart
│   │   │   ├── categorization.dart
│   │   │   └── spam_detection.dart
│   │   ├── storage/                   # Local storage (SQLite)
│   │   │   ├── message_repository.dart
│   │   │   ├── account_repository.dart
│   │   │   └── preferences_repository.dart
│   │   └── notifications/             # Push notifications
│   │       └── notification_service.dart
│   ├── ui/                            # User interface
│   │   ├── screens/
│   │   │   ├── unified_inbox.dart
│   │   │   ├── message_detail.dart
│   │   │   ├── account_settings.dart
│   │   │   └── analytics_dashboard.dart
│   │   ├── widgets/
│   │   │   ├── message_card.dart
│   │   │   ├── priority_badge.dart
│   │   │   ├── platform_icon.dart
│   │   │   └── smart_reply_suggestions.dart
│   │   └── theme/
│   │       └── app_theme.dart
│   └── state/                         # State management
│       ├── inbox_state.dart
│       ├── auth_state.dart
│       └── settings_state.dart
├── test/
│   ├── unit/                          # Unit tests
│   │   ├── models/
│   │   ├── services/
│   │   └── state/
│   ├── widget/                        # Widget tests
│   │   └── ui/
│   └── integration/                   # Integration tests
│       ├── auth_flow_test.dart
│       ├── message_sync_test.dart
│       └── offline_mode_test.dart
├── pubspec.yaml                       # Flutter dependencies
└── README.md

# Backend API (for OAuth flow handling and cloud sync)
backend/
├── src/
│   ├── api/                           # REST API endpoints
│   │   ├── auth/                      # OAuth callback handlers
│   │   │   ├── gmail.js
│   │   │   ├── exchange.js
│   │   │   ├── facebook.js
│   │   │   ├── instagram.js
│   │   │   ├── whatsapp.js
│   │   │   └── tiktok.js
│   │   ├── messages/                  # Message sync endpoints
│   │   │   ├── fetch.js
│   │   │   └── send.js
│   │   └── users/                     # User management
│   │       └── profile.js
│   ├── services/                      # Backend business logic
│   │   ├── oauth_manager.js           # OAuth token management
│   │   ├── message_aggregator.js      # Cross-platform message fetching
│   │   └── ollama_client.js           # Ollama API client
│   ├── models/                        # Database models
│   │   ├── user.js
│   │   ├── connected_account.js
│   │   └── message.js
│   └── db/                            # Database layer
│       ├── migrations/
│       └── schema.sql
├── tests/
│   ├── contract/                      # API contract tests
│   │   ├── gmail_api_test.js
│   │   ├── facebook_api_test.js
│   │   └── whatsapp_api_test.js
│   ├── integration/                   # Integration tests
│   │   ├── oauth_flow_test.js
│   │   └── message_sync_test.js
│   └── unit/                          # Unit tests
│       ├── services/
│       └── models/
├── package.json                       # Node.js dependencies
└── README.md
```

**Structure Decision**: Mobile + Web + API architecture
- **Flutter app** (`myassistanpersonal/`): Cross-platform UI for web, iOS, and Android with offline-first architecture using local SQLite storage
- **Backend API** (`backend/`): Node.js service handling OAuth2 flows (redirect URIs, token refresh), message aggregation from third-party APIs, and Ollama AI service coordination
- **Rationale**: Flutter handles all UI/UX with single codebase. Backend centralizes OAuth management (required by most platforms), coordinates message sync across platforms, and manages Ollama integration for AI features. This separation allows Flutter app to remain stateless regarding OAuth secrets while supporting offline operation.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Multiple third-party integrations (Gmail, Exchange, IMAP, Facebook, Instagram, WhatsApp, TikTok, Outlook calendars) | Core product value proposition is unifying disparate communication channels. Cannot deliver "unified communication hub" with single platform. Each integration required by FR-001 through FR-003. | Single-platform solution (e.g., email-only) insufficient - defeats primary user need of reducing context switching across platforms |
| Ollama AI integration complexity | AI features (priority scoring, smart replies, spam detection, categorization) are core differentiators per FR-006, FR-010, FR-012. User explicitly requested AI managed by Ollama for privacy and cost benefits. | Cloud AI APIs (OpenAI, Anthropic) simpler but rejected due to: (1) Privacy concerns processing sensitive communications, (2) Cost at scale for 1000+ users, (3) User requirement for Ollama |
| Backend + Flutter architecture (2 codebases) | OAuth2 flows from third-party platforms require server-side redirect URIs and secret management. Cannot safely store client secrets in Flutter app. Backend also needed for Ollama coordination and cross-device message sync. | Flutter-only with embedded secrets rejected - security violation (OAuth secrets exposed in client). Direct third-party API calls from client rejected - violates rate limiting and CORS restrictions from most platforms |
