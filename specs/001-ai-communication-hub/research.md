# Research & Technology Decisions: AI-Powered Communication Hub

**Feature**: 001-ai-communication-hub
**Date**: 2025-11-16
**Status**: Phase 0 - Technology Selection (Flutter-Focused)

## Overview

This document captures comprehensive research findings and technology decisions for the AI-Powered Communication Hub built with Flutter. All decisions prioritize simplicity, developer productivity, cross-platform compatibility, and alignment with constitutional principles.

---

## 1. Platform-Specific Email/Messaging SDKs

### Decision Summary

| Platform | Recommended Package | Pub.dev Score | Cross-Platform | Status |
|----------|-------------------|---------------|----------------|--------|
| Gmail API | `googleapis` | 1.1k likes | ✓ Web/iOS/Android | Production Ready |
| Exchange/IMAP | `enough_mail` | 140 pts, 131 likes | ✓ Web/iOS/Android | Production Ready |
| Facebook Messenger | Direct API Integration | N/A | ✓ Web/iOS/Android | Limited Access |
| Instagram DM | Direct API Integration | N/A | ✓ Web/iOS/Android | Business Only |
| WhatsApp Business | Direct API Integration | N/A | ✓ Web/iOS/Android | Complex Setup |
| TikTok Messaging | Not Available | N/A | N/A | Not Supported |
| Outlook Calendar | `microsoft_graph_api` | 150 pts, 18 likes | ✓ Web/iOS/Android | Production Ready |

### 1.1 Gmail API Integration

**Decision**: Use `googleapis` package (version 15.0.0+)

**Package Details**:
- **Name**: googleapis
- **Publisher**: Google (verified)
- **Pub.dev URL**: https://pub.dev/packages/googleapis
- **Popularity**: 1.1k likes
- **Platform Support**: Web, iOS, Android, Linux, macOS, Windows (full cross-platform)
- **Current Version**: 15.0.0

**Rationale**:
- Official Google package with verified publisher status
- Auto-generated client libraries for all Google APIs
- Full platform support including web, which is critical for this project
- Well-maintained with regular updates
- Comprehensive Gmail API v1 support including threads, messages, labels, drafts

**Implementation Notes**:
- Requires `google_sign_in` package for OAuth2 authentication
- Must enable Gmail API from Google Cloud Console
- Request appropriate scopes: `https://www.googleapis.com/auth/gmail.readonly` or `gmail.modify`
- Service account credentials should NOT be embedded in Flutter app (use backend for sensitive operations)
- Import as: `import 'package:googleapis/gmail/v1.dart' as gmail;`

**Limitations**:
- OAuth2 flow requires backend support for secure credential storage
- Rate limits apply (quota management required for 1000+ users)
- Cannot use service accounts directly from Flutter (security risk)

**Alternatives Considered**:
- Direct REST API calls: ✗ More complex, no type safety, manual OAuth handling
- `mailer` package: ✗ Only for sending emails via SMTP, not Gmail API access

---

### 1.2 Exchange/IMAP Email Access

**Decision**: Use `enough_mail` package (version 2.1.7+)

**Package Details**:
- **Name**: enough_mail
- **Publisher**: enough.de (verified)
- **Pub.dev URL**: https://pub.dev/packages/enough_mail
- **Pub Points**: 140/140
- **Popularity**: 131 likes, 7,030 weekly downloads
- **Platform Support**: Android, iOS, Linux, macOS, Windows (NOT web-compatible - pure Dart sockets)
- **Current Version**: 2.1.7
- **License**: Mozilla Public License 2.0 (commercial-friendly)

**Rationale**:
- Most comprehensive email package for Flutter with IMAP, POP3, and SMTP support
- Excellent pub.dev score (140/140 points)
- Both high-level API (automatic reconnection) and low-level protocol access
- Extensive IMAP extension support (IDLE for push, MOVE, CONDSTORE, QRESYNC, QUOTA)
- MIME message parsing and generation
- Active maintenance (last update 2 months ago)

**Implementation Notes**:
- Use `enough_mail_discovery` companion package for auto-discovering email server settings
- IDLE extension enables push-like notifications for new emails without polling
- Supports OAuth2 for modern email providers (Microsoft 365, etc.)
- Character encoding support for international emails (UTF-8, ISO-8859, Chinese, Cyrillic)
- DKIM signing support for sending authenticated emails

**Limitations**:
- **NOT web-compatible** - Uses native socket connections which don't work in browsers
- For web platform, must use backend proxy or restrict to mobile-only features
- Exchange Web Services (EWS) not directly supported - use IMAP/SMTP on Exchange servers with these protocols enabled

**Alternatives Considered**:
- `imap_client`: ✗ Less feature-rich, fewer extensions, less active maintenance
- `flutter_mailer`: ✗ Only opens native mail app, doesn't provide API access
- Direct socket implementation: ✗ Violates simplicity principle, reinventing the wheel

**Web Platform Strategy**:
Since `enough_mail` doesn't support web, use one of these approaches:
1. **Backend Proxy** (Recommended): Route email operations through Node.js/Python backend using IMAP libraries
2. **Platform-Specific Code**: Disable email features on web, or use Gmail API only for web users
3. **Hybrid Approach**: Use `googleapis` for Gmail on all platforms, `enough_mail` for IMAP only on mobile

---

### 1.3 Facebook Messenger API

**Decision**: Direct Meta Messenger API integration (no dedicated Flutter package)

**Package Details**:
- **Flutter Package**: None available
- **API**: Meta Messenger Platform API
- **Documentation**: https://developers.facebook.com/docs/messenger-platform

**Rationale**:
- No comprehensive Flutter package exists for Messenger API integration
- Meta provides REST API that can be accessed via HTTP client (dio, http)
- Must use official Meta Messenger API directly

**Implementation Notes**:
- Use `dio` or `http` package for REST API calls
- OAuth2 via Facebook Login: Use `flutter_facebook_auth` package
- Webhook-based architecture required for receiving messages
- Backend server needed to handle webhook callbacks and verify tokens
- Messenger API primarily designed for business/bot interactions

**Limitations**:
- **Consumer App Restrictions**: Meta has restricted Graph API access for consumer messaging apps
- Primarily supports business messaging use cases (customer service bots)
- Requires Facebook App approval and review process
- Webhook endpoint must be publicly accessible (requires backend)
- Rate limits and platform policy restrictions

**Alternatives Considered**:
- `share_plus`: ✗ Only for sharing content TO Messenger, not reading messages
- Third-party packages: ✗ None found with comprehensive API access

**Recommendation**:
Given Meta's restrictions on consumer messaging APIs, consider **deferring Facebook Messenger integration** until P2/P3 phases. Focus on email and more accessible platforms for MVP (P1).

---

### 1.4 Instagram Direct Messages API

**Decision**: Direct Meta Messenger API for Instagram integration (Business accounts only)

**Package Details**:
- **Flutter Package**: None available
- **API**: Instagram Messenger API (part of Meta Messenger Platform)
- **Documentation**: https://developers.facebook.com/docs/messenger-platform/instagram

**Rationale**:
- Meta unified Instagram DM with Messenger API (announced 2020, fully rolled out 2021)
- Business accounts can access Instagram messages via Messenger API
- Same technical approach as Facebook Messenger

**Implementation Notes**:
- Requires Instagram Business Account (not personal accounts)
- Use same OAuth2 flow as Facebook (`flutter_facebook_auth`)
- Must request Instagram-specific permissions: `instagram_basic`, `instagram_manage_messages`
- Webhook configuration identical to Messenger
- Backend server required for webhook handling

**Limitations**:
- **Business Accounts Only**: Personal Instagram accounts cannot access this API
- Requires connection between Instagram Business account and Facebook Page
- Subject to Meta's strict platform policies and approval process
- Customer service use cases prioritized; consumer app access limited
- Rate limits apply

**Alternatives Considered**:
- Instagram Graph API: ✗ Focused on media publishing, not DM access
- Third-party packages: ✗ No comprehensive Flutter packages exist

**Recommendation**:
**Defer to P3 or later**. Focus on email and more accessible platforms for MVP. Instagram DM requires business account setup and Meta approval process, adding complexity without guaranteed approval.

---

### 1.5 WhatsApp Business API

**Decision**: Direct WhatsApp Business API integration via Business Solution Provider

**Package Details**:
- **Flutter Package**: `whatsapp` (pub.dev) - Limited functionality
- **Official API**: WhatsApp Business Platform API
- **Alternative**: Twilio WhatsApp Business API (easier integration)

**Rationale**:
- WhatsApp Business API is the only official method for programmatic access
- Consumer WhatsApp API does not exist (privacy/security by design)
- `whatsapp` Flutter package only opens WhatsApp app for sharing, doesn't provide message access
- Must use official API or BSP (Business Solution Provider) like Twilio

**Implementation Notes**:
- **Two Options**:
  1. **Direct WhatsApp Business API**: Requires dedicated phone number, business verification, Facebook Business Manager account
  2. **Twilio API** (Recommended): Simplified integration, pay-per-message pricing, better documentation
- Backend server required (cannot call from Flutter directly due to API keys)
- Webhook architecture for receiving messages
- Template messages required for business-initiated conversations

**Limitations**:
- **Business Use Only**: Designed for customer service, not consumer peer-to-peer messaging
- Complex approval process (business verification with Meta)
- Costs: Per-conversation pricing model (varies by country)
- 24-hour session window for free-form responses
- Cannot access personal WhatsApp account messages
- Phone number must be dedicated to API (cannot use on regular WhatsApp simultaneously)

**Cost Estimates**:
- WhatsApp Business API (via Twilio): ~$0.005-0.10 per message depending on country
- 1000 users, average 100 messages/user/month = 100k messages = ~$500-10,000/month
- Free tier not available for production use

**Alternatives Considered**:
- `whatsapp` Flutter package: ✗ Only opens app for sharing, no API access
- Unofficial APIs/web scraping: ✗ Violates WhatsApp ToS, unreliable, security risk
- WhatsApp Cloud API: ✓ Alternative to on-premise, hosted by Meta, same limitations

**Recommendation**:
**Defer to P4 or later** unless targeting business customer service use cases. For MVP, focus on email and platforms with easier integration. If WhatsApp is critical, use Twilio API wrapper and budget for per-message costs.

---

### 1.6 TikTok Messaging API

**Decision**: Not available for integration

**Package Details**:
- **Flutter Package**: None
- **API**: TikTok does not provide public messaging API

**Rationale**:
- TikTok does not offer a public API for direct messages
- TikTok for Developers focuses on content creation, analytics, and login
- No official or reliable third-party access to TikTok DMs

**Implementation Notes**:
- Not applicable - API does not exist

**Limitations**:
- No programmatic access to TikTok messages
- TikTok API primarily supports: Login, User Info, Video Management, Analytics
- Messaging features are not exposed in developer APIs

**Alternatives Considered**:
- Third-party integrations: ✗ Services like respond.io only support TikTok Business Messaging (beta, limited availability)
- Web scraping: ✗ Violates ToS, unreliable, no Flutter support

**Recommendation**:
**Exclude TikTok messaging from all phases**. Focus development efforts on platforms with accessible APIs. Monitor TikTok for Developers for future API releases, but do not plan for this integration in current roadmap.

---

### 1.7 Outlook Calendar API

**Decision**: Use `microsoft_graph_api` package (version 0.0.14+)

**Package Details**:
- **Name**: microsoft_graph_api
- **Publisher**: kahle.dev (verified)
- **Pub.dev URL**: https://pub.dev/packages/microsoft_graph_api
- **Pub Points**: 150/150
- **Popularity**: 18 likes, 1.75k weekly downloads
- **Platform Support**: Android, iOS, Linux, macOS, Web, Windows (full cross-platform)
- **Current Version**: 0.0.14
- **License**: BSD-3-Clause

**Rationale**:
- Comprehensive package for Microsoft Graph API access
- Perfect pub.dev score (150/150 points)
- Full cross-platform support including web
- Covers Calendar, Mail, Users, Contacts, Notes
- Actively maintained with verified publisher

**Implementation Notes**:
- Requires OAuth2 authentication with Microsoft Identity Platform
- Use `oauth2` or `flutter_appauth` for authentication flow
- Required scopes: `Calendars.Read`, `Calendars.ReadWrite` for calendar access
- Backend recommended for secure token refresh
- Initialize with: `MSGraphAPI(accessToken: 'your_token')`
- Access calendar via: `msGraphAPI.calendar.getEvents()`

**Limitations**:
- OAuth2 flow requires app registration in Azure AD
- Relatively low popularity (18 likes) compared to googleapis
- May require direct Microsoft Graph REST calls for advanced features not covered by package
- Token expiration handling must be implemented manually

**Alternatives Considered**:
- Direct Microsoft Graph REST API: ✗ More complex, manual HTTP client management
- `flutter_microsoft_authentication`: ✗ Auth only, doesn't include Graph API access
- `enough_mail` for Exchange: ✓ Works but limited to email, not calendar

**Integration Strategy**:
- Use `microsoft_graph_api` for calendar operations
- Combine with `enough_mail` if IMAP/SMTP needed for Exchange email
- Backend handles OAuth2 token refresh and storage
- Cache calendar events locally using SQLite

---

### Platform Integration Priority Matrix

Based on API availability, complexity, and business value:

| Priority | Platform | Integration Complexity | Business Value | Recommendation |
|----------|----------|----------------------|----------------|----------------|
| P1 | Gmail | Medium | High | ✓ Include in MVP |
| P1 | IMAP/Exchange Email | Medium | High | ✓ Include in MVP (mobile-first) |
| P2 | Outlook Calendar | Medium | Medium | ✓ Include in P2 |
| P3 | Facebook Messenger | High | Medium | ⚠️ Defer to P3, business use only |
| P3 | Instagram DM | High | Medium | ⚠️ Defer to P3, business use only |
| P4 | WhatsApp Business | Very High | Low-Medium | ⚠️ Defer to P4, high cost |
| N/A | TikTok Messaging | N/A | Low | ✗ Exclude from roadmap |

---

## 2. State Management

### Decision: Riverpod 2.x

**Rationale**:
- **Best overall for medium-to-large apps**: Modern architecture, minimal boilerplate, highly testable
- **Superior testing support**: No dependency on BuildContext for state access, making unit tests straightforward
- **Real-time messaging performance**: Efficient state updates with fine-grained reactivity - only affected widgets rebuild
- **Excellent developer experience**: Compile-time safety with provider types, auto-dispose, and built-in debugging
- **Strong community**: Created by Remi Rousselet (Provider author), active development, extensive documentation
- **Future-proof**: Active development with Riverpod 3.0 bringing modular architecture and enhanced tooling

**Performance Characteristics**:
- Minimal widget rebuilds through granular state subscriptions
- Efficient for frequent updates (real-time message sync)
- State changes propagate only to listening widgets
- Built-in state caching and memoization

**Learning Curve**:
- Medium difficulty - easier than Bloc, steeper than Provider
- Requires understanding of providers, consumers, and state notifiers
- Excellent documentation and code generation tools available

**Alternatives Considered**:

**Bloc (Business Logic Component)**:
- ✓ Excellent for large-scale enterprise apps with complex business logic
- ✓ Highly structured with clear separation of concerns
- ✓ Stream-based architecture ideal for event-driven systems
- ✗ **Steeper learning curve** - requires understanding of streams, events, and states
- ✗ **More boilerplate** - separate files for events, states, and blocs
- ✗ **Overkill for MVP** - adds complexity without significant benefits for initial scope
- Use case: Better for teams with strict architectural requirements or existing Bloc expertise

**Provider**:
- ✓ Simplest learning curve - officially backed by Flutter team
- ✓ Great for small-to-medium apps
- ✓ Reliable and stable with broad adoption
- ✗ **Riverpod solves its limitations** - no context dependency, better testability, improved state disposal
- ✗ **Less suitable for complex state** - lacks advanced features for large apps
- ✗ **Riverpod is Provider's successor** - created by same author to address weaknesses
- Use case: Good for simple apps or teams new to state management

**GetX**:
- ✓ Minimal boilerplate - fastest to implement
- ✓ Excellent performance - highly optimized
- ✓ All-in-one solution - includes routing, dependency injection, state management
- ✗ **Magic behavior** - uses reflection and global state, harder to debug
- ✗ **Testing challenges** - global dependencies complicate unit testing
- ✗ **Less predictable** - implicit state changes can cause bugs in complex apps
- ✗ **Community concerns** - debates about best practices and maintainability
- Use case: Rapid prototyping or small apps prioritizing speed over maintainability

**Comparison Table**:

| Feature | Riverpod | Bloc | Provider | GetX |
|---------|----------|------|----------|------|
| Learning Curve | Medium | Steep | Easy | Easy |
| Boilerplate | Low | High | Low | Very Low |
| Testing Support | Excellent | Excellent | Good | Fair |
| Performance | Excellent | Excellent | Good | Excellent |
| Real-time Updates | Excellent | Excellent | Good | Excellent |
| Type Safety | Strong | Strong | Medium | Weak |
| Community Support | Growing Fast | Mature | Mature | Large |
| Debugging Tools | Excellent | Excellent | Good | Good |

**Implementation Notes**:
- Use Riverpod Generator for code generation (reduces boilerplate)
- Organize providers in separate files by feature (auth_provider.dart, inbox_provider.dart)
- Use `StateNotifier` for complex state, `Provider` for simple read-only values
- Implement `AsyncNotifier` for async operations (API calls, database queries)
- Use `family` modifier for parameterized providers (e.g., message by ID)
- Enable `ProviderObserver` for debugging state changes in development

**Example Structure**:
```dart
// Message list provider
@riverpod
class MessageList extends _$MessageList {
  @override
  Future<List<Message>> build() async {
    return await ref.watch(messageRepositoryProvider).fetchMessages();
  }

  void refresh() => ref.invalidateSelf();
}

// UI consumption
class InboxScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final messages = ref.watch(messageListProvider);
    return messages.when(
      data: (list) => MessageListView(messages: list),
      loading: () => CircularProgressIndicator(),
      error: (err, stack) => ErrorView(error: err),
    );
  }
}
```

---

## 3. Backend API Framework

### Decision: Node.js with Express.js (TypeScript)

**Rationale**:
- **OAuth2 ecosystem excellence**: Mature libraries (Passport.js) with strategies for all required platforms
- **Async/event-driven model**: Perfect for real-time message synchronization and concurrent API calls
- **Third-party API integration**: Extensive npm ecosystem with official SDKs for Gmail, Microsoft Graph, Meta APIs
- **Ollama client library**: Official JavaScript client (`ollama-js`) maintained by Ollama team
- **Performance for 1000 concurrent users**: Event loop efficiently handles I/O-bound operations (API calls, database queries)
- **Team productivity**: JavaScript/TypeScript familiarity reduces onboarding time
- **Type safety**: TypeScript provides compile-time checking without runtime overhead

**Performance for Target Scale**:
- 1000 concurrent users: ✓ Easily supported with proper architecture
- Non-blocking I/O ideal for multiple third-party API calls per request
- Benchmarks: ~15,000 requests/second for simple REST endpoints (sufficient for messaging app)
- Horizontal scaling straightforward with load balancer + multiple Node.js instances

**OAuth2 Library Support**:
- `passport.js`: 500+ authentication strategies including all required platforms
- Official SDKs: `@googleapis/gmail`, `@microsoft/microsoft-graph-client`, `node-facebook-sdk`
- Token management: `jsonwebtoken`, `express-session`, `connect-pg-simple`

**Ollama Client Library**:
- **Package**: `ollama-js` (official)
- **Features**: Full API coverage, TypeScript support, streaming responses
- **GitHub**: https://github.com/ollama/ollama-js
- **Easy integration**: REST-based, simple async/await syntax

**Alternatives Considered**:

**Python with FastAPI**:
- ✓ Excellent async support (ASGI-based), built-in OAuth2 and JWT security
- ✓ Superior AI/ML ecosystem - natural fit if using Python for AI processing
- ✓ Automatic API documentation (OpenAPI/Swagger)
- ✗ **Slower for I/O operations** - Express ~1.5x faster than FastAPI in benchmarks
- ✗ **Smaller OAuth2 ecosystem** - fewer pre-built integrations compared to Passport.js
- ✗ **Separate tech stack** - if Flutter team knows JavaScript, increases team efficiency
- ✓ **Ollama support**: Official Python client library (`ollama-python`)
- Use case: Choose if team has strong Python expertise or heavy AI/ML processing

**Go with Gin/Echo**:
- ✓ **Best raw performance** - ~7-11x faster than Express in benchmarks
- ✓ Excellent concurrency with goroutines
- ✓ Low memory footprint and fast startup time
- ✗ **Steeper learning curve** - compiled language, different paradigms
- ✗ **Smaller OAuth2 ecosystem** - fewer pre-built integrations than Node.js
- ✗ **Less third-party API support** - many services prioritize JS/Python SDKs
- ✓ **Ollama support**: Recommended Go client (`github.com/ollama/ollama/api`)
- Use case: Choose for performance-critical applications or if team has Go expertise

**Dart with shelf**:
- ✓ Same language as Flutter - maximum code sharing
- ✓ Strong typing end-to-end
- ✓ Good async support
- ✗ **Smallest ecosystem** - limited third-party packages compared to Node.js/Python
- ✗ **Fewer OAuth2 libraries** - must implement many integrations manually
- ✗ **Less mature tooling** - fewer production examples, smaller community
- ✗ **No official Ollama client** - must use HTTP client directly
- Use case: Small teams wanting single-language stack, willing to implement OAuth flows manually

**Comparison Table**:

| Feature | Node.js/Express | Python/FastAPI | Go/Gin | Dart/shelf |
|---------|----------------|----------------|---------|------------|
| OAuth2 Ecosystem | Excellent | Good | Fair | Limited |
| Third-party APIs | Excellent | Good | Fair | Fair |
| Performance (1K users) | Excellent | Good | Excellent | Good |
| Learning Curve | Easy | Easy | Medium | Easy |
| Ollama Support | Official (ollama-js) | Official (ollama-python) | Official (ollama/api) | DIY (HTTP) |
| Community/Ecosystem | Largest | Large | Medium | Small |
| Type Safety | TypeScript | Python + Type Hints | Native | Native |
| Production Examples | Abundant | Growing | Growing | Limited |

**Implementation Notes**:
- Use **Express.js** for simplicity, or **Fastify** if benchmarks show performance bottlenecks
- TypeScript 5+ for full type safety across codebase
- Structure: Route → Controller → Service → Repository pattern
- Use `express-rate-limit` for API rate limiting
- OAuth2 token storage: PostgreSQL with encryption
- Session management: `express-session` with PostgreSQL store (`connect-pg-simple`)
- Background jobs: `Bull` (Redis-based queue) for message sync tasks
- API documentation: `swagger-jsdoc` + `swagger-ui-express`

**Example OAuth2 Flow with Passport.js**:
```typescript
// Gmail OAuth2 strategy
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    scope: ['https://www.googleapis.com/auth/gmail.readonly']
  },
  async (accessToken, refreshToken, profile, done) => {
    // Store tokens in database
    const user = await saveUserTokens(profile.id, accessToken, refreshToken);
    return done(null, user);
  }
));

// Route
app.get('/auth/google', passport.authenticate('google'));
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => res.redirect('/dashboard')
);
```

---

## 4. Cloud Storage & Database

### Decision: PostgreSQL with Supabase (managed)

**Rationale**:
- **Relational model excellence**: Clear entity relationships (User → ConnectedAccount → Message → Category)
- **Real-time sync built-in**: Supabase provides real-time subscriptions via PostgreSQL logical replication
- **Offline support**: Use Supabase Flutter SDK with local SQLite cache (data persistence layer)
- **Cost-effective at scale**: Predictable pricing, generous free tier
- **Excellent Flutter SDK**: Official Supabase Flutter package with 150/150 pub.dev score
- **ACID compliance**: Critical for read/unread sync across platforms (consistency guarantees)
- **Advanced querying**: SQL joins, full-text search (requirement FR-025), complex filters

**Cost Analysis (1000 users, 10k messages/user)**:
- **Storage**: 10M messages × ~5KB average = 50GB database
- **Bandwidth**: Assume 100MB/user/month = 100GB egress
- **Supabase Pricing**:
  - Free Tier: Up to 500MB database, 2GB bandwidth (insufficient)
  - Pro Plan: $25/month + usage
    - 8GB database included, then $0.125/GB = 50GB = $25 + (42GB × $0.125) = $30.25/month
    - 250GB bandwidth included (sufficient)
  - **Total estimated cost**: ~$30-40/month for 1000 users

**Real-time Sync Capabilities**:
- **Supabase Realtime**: PostgreSQL logical replication broadcasts changes to subscribed clients
- **Flutter integration**: Listen to database changes with `.stream()` method
- **Latency**: <1 second for real-time updates (local network)
- **Conflict resolution**: Last-write-wins by default, custom logic possible

**Offline Support Implementation**:
- **Strategy**: Offline-first architecture with local SQLite + cloud sync
- **Local cache**: `sqflite` package for on-device storage
- **Sync logic**: Supabase Flutter SDK handles synchronization
- **Conflict handling**: Timestamp-based merging, Supabase handles server-side

**Flutter SDK Quality**:
- **Package**: `supabase_flutter`
- **Pub.dev Score**: 150/150
- **Popularity**: 4.7k likes, very active
- **Features**: Auth, Database, Storage, Realtime, Edge Functions
- **Platform Support**: Android, iOS, Web, Linux, macOS, Windows

**Alternatives Considered**:

**Firebase Firestore**:
- ✓ **Best real-time sync** - mature, battle-tested, automatic scaling
- ✓ **Excellent offline support** - built-in client-side caching, automatic sync when online
- ✓ **Superior Flutter SDK** - official Google package, extensive documentation
- ✗ **Cost at scale**: Expensive for high read/write volumes
  - Pricing: $0.06 per 100k document reads, $0.18 per 100k writes
  - 1000 users × 10k messages = 10M reads/month for initial load = $600/month (reads only!)
  - Write costs: New messages, updates = additional $$$
- ✗ **Query limitations** - shallow queries, no joins, limited filtering
- ✗ **Unpredictable costs** - poorly optimized queries can spike bills
- Use case: Choose if real-time sync and offline support are critical and budget allows

**MongoDB (Atlas)**:
- ✓ Flexible schema - good for heterogeneous message types
- ✓ Horizontal scaling - sharding built-in
- ✓ Good Flutter support - `mongo_dart` package
- ✗ **Weaker consistency** - eventual consistency can cause read/unread sync issues
- ✗ **Complex relational queries** - joining user → account → message data less elegant than SQL
- ✗ **Real-time sync** - requires MongoDB Realm or custom implementation (added complexity)
- ✗ **Cost**: MongoDB Atlas pricing comparable to Supabase but with less features
  - M10 cluster (2GB RAM): $57/month minimum
- Use case: Choose if document flexibility outweighs relational structure needs

**PostgreSQL (self-managed)**:
- ✓ Full control over infrastructure
- ✓ No vendor lock-in
- ✓ Potentially lower cost at very high scale
- ✗ **DevOps overhead** - server management, backups, scaling, security patches
- ✗ **No built-in realtime** - must implement with websockets or polling
- ✗ **Violates simplicity principle** - adds operational complexity
- Use case: Choose only if you have dedicated DevOps team or specific compliance requirements

**Comparison Table**:

| Feature | Supabase (PostgreSQL) | Firebase Firestore | MongoDB Atlas | Self-Managed PostgreSQL |
|---------|----------------------|-------------------|---------------|-------------------------|
| Real-time Sync | Good (logical replication) | Excellent (native) | Fair (requires Realm) | DIY |
| Offline Support | Good (with Flutter SDK) | Excellent (built-in) | Fair | DIY |
| Cost (1K users, 10K msgs) | ~$30-40/month | ~$600+/month | ~$57+/month | ~$10-20/month + DevOps |
| Flutter SDK Quality | Excellent (150 pts) | Excellent (official) | Good (mongo_dart) | N/A (use libraries) |
| Query Complexity | Excellent (SQL) | Fair (NoSQL limits) | Good (aggregations) | Excellent (SQL) |
| Consistency | ACID | Eventual | Eventual | ACID |
| Full-text Search | Built-in (pg_trgm) | Limited | Text indexes | Built-in |
| Learning Curve | Medium (SQL) | Easy | Medium (NoSQL) | Medium (SQL + DevOps) |
| Vendor Lock-in | Low (standard PostgreSQL) | High (Firestore-specific) | Medium | None |

**Implementation Notes**:
- Use Supabase for managed PostgreSQL with realtime features
- **Schema design**:
  - `users` table: id, email, created_at, preferences (JSONB)
  - `connected_accounts` table: id, user_id (FK), platform, oauth_tokens (encrypted), status
  - `messages` table: id, account_id (FK), external_id, content, sender, timestamp, read_status, priority_score, category_id (FK)
  - `categories` table: id, user_id (FK), name, color, auto_rules (JSONB)
- **Indexes**: user_id, timestamp, priority_score, category_id, read_status
- **Partitioning**: Consider time-based partitioning if >100k messages/user
- **Full-text search**: Use `tsvector` and GIN indexes for message search
- **Offline-first architecture**:
  ```dart
  // Local SQLite cache
  final localDb = await LocalDatabase.instance;

  // Fetch from local first
  var messages = await localDb.getMessages();

  // Sync with Supabase in background
  supabase.from('messages')
    .stream(primaryKey: ['id'])
    .listen((data) {
      localDb.upsertMessages(data);
    });
  ```

**Migration Path**:
If Supabase becomes insufficient, migration to self-managed PostgreSQL is straightforward (standard SQL export/import). If Firebase's offline capabilities become critical, consider hybrid approach with Firebase for mobile, PostgreSQL for web.

---

## 5. E2E Testing Strategy

### Decision: Multi-layered approach with mock servers, contract testing, and selective live integration tests

**Testing OAuth2 Flows Without Exposing Credentials**:

**Approach 1: Mock OAuth2 Server (Recommended for CI/CD)**
- **Tool**: `mock-oauth2-server` (GitHub: navikt/mock-oauth2-server) or Beeceptor
- **How it works**:
  - Simulates OAuth2 provider (Google, Microsoft, Facebook)
  - Accepts any credentials, returns realistic tokens
  - No real API keys needed
- **Implementation**:
  ```typescript
  // Test environment configuration
  if (process.env.NODE_ENV === 'test') {
    const mockServer = new MockOAuth2Server();
    await mockServer.start(8080);
    process.env.OAUTH_PROVIDER_URL = 'http://localhost:8080';
  }

  // OAuth2 flow test
  it('should complete Google OAuth flow', async () => {
    const response = await request(app)
      .get('/auth/google/callback?code=mock_auth_code')
      .expect(302);
    expect(response.headers.location).to.equal('/dashboard');
  });
  ```
- **Benefits**: Fast, no external dependencies, consistent results, works offline
- **Limitations**: Doesn't catch real API changes

**Approach 2: Test User Accounts**
- **Google**: No official test users (unlike Facebook)
- **Facebook**: Provides test users via App Dashboard
- **Microsoft**: Azure AD test tenants available
- **Implementation**:
  - Create dedicated test accounts for each platform
  - Store credentials in CI/CD secrets (GitHub Actions secrets, environment variables)
  - Use separate test app registrations (not production credentials)
- **Benefits**: Tests real OAuth flows
- **Limitations**: Requires maintenance, rate limits, credentials in CI

**Approach 3: Environment-based Credential Injection**
- **Tool**: `dotenv` for local, GitHub Secrets for CI
- **Implementation**:
  ```typescript
  // Load test credentials from environment
  const testConfig = {
    google: {
      clientId: process.env.TEST_GOOGLE_CLIENT_ID,
      clientSecret: process.env.TEST_GOOGLE_CLIENT_SECRET,
      testUser: process.env.TEST_GOOGLE_EMAIL
    }
  };

  // Never commit credentials to repo
  // .env.test (gitignored)
  TEST_GOOGLE_CLIENT_ID=your_test_app_id
  TEST_GOOGLE_CLIENT_SECRET=your_test_secret
  ```
- **Benefits**: Secure, environment-specific
- **Best Practice**: Use different OAuth apps for dev/test/prod

**Recommended OAuth Testing Strategy**:
1. **Unit tests**: Mock OAuth2 server for fast, isolated tests
2. **Integration tests**: Test accounts with real OAuth flows (nightly builds)
3. **Manual QA**: Real user accounts in staging environment

---

**Mocking Strategies for Third-Party APIs**:

**Approach 1: HTTP Mocking with Nock (Node.js)**
- **Tool**: `nock` for intercepting HTTP requests
- **Implementation**:
  ```typescript
  import nock from 'nock';

  describe('Gmail API Integration', () => {
    beforeEach(() => {
      nock('https://gmail.googleapis.com')
        .get('/gmail/v1/users/me/messages')
        .reply(200, {
          messages: [
            { id: '123', threadId: 'abc' }
          ]
        });
    });

    it('should fetch messages', async () => {
      const messages = await gmailService.fetchMessages();
      expect(messages).toHaveLength(1);
    });
  });
  ```
- **Benefits**: Fast, deterministic, no API rate limits
- **Use for**: Unit tests, most integration tests

**Approach 2: Mock Service Layer**
- **Pattern**: Repository pattern with mock implementations
- **Implementation**:
  ```typescript
  // Interface
  interface IGmailRepository {
    fetchMessages(): Promise<Message[]>;
  }

  // Production implementation
  class GmailRepository implements IGmailRepository {
    async fetchMessages() {
      // Real Gmail API call
    }
  }

  // Test mock
  class MockGmailRepository implements IGmailRepository {
    async fetchMessages() {
      return [mockMessage1, mockMessage2];
    }
  }

  // Dependency injection
  const repo = process.env.NODE_ENV === 'test'
    ? new MockGmailRepository()
    : new GmailRepository();
  ```
- **Benefits**: Clean separation, easy to swap implementations
- **Use for**: Testing business logic independently of external APIs

**Approach 3: Record/Replay (VCR Pattern)**
- **Tool**: `nock` recorder or custom solution
- **How it works**:
  1. First run: Make real API calls, record responses
  2. Subsequent runs: Replay recorded responses
- **Implementation**:
  ```typescript
  // Record mode
  nock.recorder.rec({
    output_objects: true,
    enable_reqheaders_recording: true
  });
  // Make real API calls...
  const recordings = nock.recorder.play();
  fs.writeFileSync('fixtures/gmail_api.json', JSON.stringify(recordings));

  // Replay mode
  const fixtures = JSON.parse(fs.readFileSync('fixtures/gmail_api.json'));
  nock.define(fixtures);
  ```
- **Benefits**: Realistic responses, tests API integration without live calls
- **Limitations**: Requires periodic re-recording when APIs change

**Recommended API Mocking Strategy**:
- **Development/Unit tests**: HTTP mocking (nock) for speed
- **CI Integration tests**: Mock service layer or recorded fixtures
- **Nightly tests**: Real API calls with test accounts (catch breaking changes)

---

**Tools for Integration Testing with External Services**:

**1. Testcontainers (for database/services)**
- **Use**: Spin up real PostgreSQL, Redis in Docker for integration tests
- **Implementation**:
  ```typescript
  import { PostgreSqlContainer } from 'testcontainers';

  let container: PostgreSqlContainer;

  beforeAll(async () => {
    container = await new PostgreSqlContainer().start();
    process.env.DATABASE_URL = container.getConnectionUri();
  });

  afterAll(async () => {
    await container.stop();
  });
  ```
- **Benefits**: Real database, isolated environment, consistent

**2. Pact (Contract Testing)**
- **Use**: Consumer-driven contract testing between Flutter app and backend
- **How it works**:
  - Frontend defines expected API contract (request/response shapes)
  - Backend verifies it fulfills contract
  - Catches breaking changes before deployment
- **Implementation**:
  ```typescript
  // Frontend (Consumer) - Flutter test
  final pact = PactMockService('FlutterApp', 'BackendAPI');
  await pact.given('user has messages')
    .uponReceiving('a request for messages')
    .withRequest('GET', '/api/messages')
    .willRespondWith(200, body: {
      'messages': eachLike({'id': '123', 'content': 'test'})
    });

  // Backend (Provider) - Node.js test
  const verifier = new Verifier({
    providerBaseUrl: 'http://localhost:3000',
    pactUrls: ['pacts/flutterapp-backendapi.json']
  });
  await verifier.verifyProvider();
  ```
- **Benefits**: Prevents breaking changes, ensures API compatibility
- **Tool**: Pact (https://pact.io/)

**3. Postman/Newman (API Testing)**
- **Use**: API endpoint testing, can run in CI/CD
- **Implementation**:
  - Create Postman collections for each API endpoint
  - Export collections
  - Run with Newman CLI in CI: `newman run api-tests.json`
- **Benefits**: Non-developers can create tests, visual interface

**4. Playwright/Cypress (E2E Web)**
- **Use**: End-to-end testing of web frontend OAuth flows
- **Limitation**: Requires real credentials or mock OAuth server
- **Implementation**:
  ```typescript
  // Playwright test
  test('user can login with Google', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('button:text("Login with Google")');
    // Fill Google login form (use test account)
    await page.fill('input[type="email"]', testUser.email);
    await page.click('button:text("Next")');
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button:text("Sign in")');
    // Verify redirect
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
  });
  ```

---

**Best Practices for Contract Testing**:

**1. Consumer-Driven Contracts (Recommended)**
- **Principle**: API consumers (Flutter app) define expected contracts
- **Why**: Frontend knows what data it needs; backend verifies it provides it
- **Implementation**: Use Pact or OpenAPI schema validation

**2. OpenAPI/Swagger Specification**
- **Approach**: Define API contract in OpenAPI YAML
- **Generate types**: Use `openapi-generator` to create TypeScript types for backend, Dart classes for Flutter
- **Validate**: Use `express-openapi-validator` middleware to enforce schema
- **Benefits**: Single source of truth, auto-generated documentation

**3. Schema Validation**
- **Tool**: `zod` (TypeScript), `ajv` (JSON Schema)
- **Implementation**:
  ```typescript
  import { z } from 'zod';

  // Define schema
  const MessageSchema = z.object({
    id: z.string(),
    content: z.string(),
    timestamp: z.string().datetime(),
    read: z.boolean()
  });

  // Validate API response
  app.get('/api/messages', async (req, res) => {
    const messages = await fetchMessages();
    messages.forEach(msg => MessageSchema.parse(msg)); // Throws if invalid
    res.json(messages);
  });
  ```

**4. Versioning Strategy**
- **URL versioning**: `/api/v1/messages`, `/api/v2/messages`
- **Header versioning**: `Accept: application/vnd.api+json; version=1`
- **Deprecation policy**: Maintain old versions for 6 months minimum

**Testing Pyramid for This Project**:

```
        /\
       /  \  E2E (Manual QA, Playwright)
      /____\  - OAuth flows with test accounts
     /      \  - Critical user journeys
    /________\ Integration (Pact, Supertest)
   /          \ - API contract tests
  /____________\ - Real database (Testcontainers)
 /              \ Unit (Jest, Mock APIs)
/________________\ - Business logic with mocks
                    - HTTP mocking (nock)
```

**Recommended Testing Stack**:
- **Unit tests**: Jest + nock (HTTP mocking)
- **Integration tests**: Supertest + Testcontainers (real database) + Mock OAuth server
- **Contract tests**: Pact or OpenAPI validation
- **E2E tests**: Playwright for web, Detox for mobile (limited, critical paths only)
- **API monitoring**: Postman monitors or dedicated service to catch real API changes

---

## 6. Ollama Deployment Strategy

### Decision: Hybrid deployment (cloud for web, local for mobile)

**Cloud-Hosted Ollama (Web Platform)**:

**Recommended Provider**: Elestio or Self-Managed VPS with GPU

**Cost Estimates**:
- **Elestio (Managed)**:
  - Pricing: Hourly billing based on cloud provider choice
  - Example: Hetzner CPX31 (4 vCPU, 8GB RAM) = ~$20/month
  - GPU instances (for faster inference): $50-200/month depending on provider
- **VPS Options**:
  - Webdock: Starting $3/month (CPU-only, slower)
  - Kamatera: $4/month base (needs upgrade for Ollama)
  - Cloud Clusters: $2.99/month (promotional pricing)
- **Minimum Requirements**: 8GB RAM for 7B models, 16GB for 13B models
- **Realistic Cost for Production**: $50-100/month for GPU-enabled VPS

**Official Ollama Cloud**:
- Status: Recently announced "Ollama Cloud" for datacenter-grade hardware
- Pricing: Not yet publicly available (as of Nov 2025)
- Benefit: Official support, optimized infrastructure
- Recommendation: Monitor for GA availability, may become preferred option

**Pros**:
- ✓ Consistent performance across all platforms (web included)
- ✓ No client-side resource constraints
- ✓ Centralized model management (update once, affects all users)
- ✓ Better latency for web users (no cross-origin limitations)
- ✓ Can use larger, more capable models (13B, 33B with GPU)

**Cons**:
- ✗ Recurring infrastructure costs ($50-100/month minimum)
- ✗ Privacy concerns (messages sent to cloud for processing)
- ✗ Requires scaling strategy as user base grows
- ✗ Single point of failure (server downtime affects all users)

---

**Client-Side Ollama (Mobile - iOS/Android)**:

**Status**: Not feasible for production

**Why NOT Recommended**:
- ✗ **No native mobile support**: Ollama doesn't run natively on iOS/Android
- ✗ **Resource constraints**: 7B models require 8GB RAM; most phones have 6-12GB total (shared with OS/apps)
- ✗ **Battery drain**: LLM inference is CPU/GPU intensive
- ✗ **Storage**: Models are 4-7GB each (significant app size)
- ✗ **Inconsistent performance**: Varies by device capability

**Workaround (Not Recommended)**:
- Run Ollama on user's home server/computer, expose via tunnel (ngrok/localtunnel)
- Mobile app connects to remote Ollama instance
- **Issues**: Requires technical users, unreliable connectivity, security risks

---

**Hybrid Approach (RECOMMENDED)**:

**Architecture**:
1. **Web platform**: All users → Cloud-hosted Ollama (backend server)
2. **Mobile platform**: Users → Cloud-hosted Ollama (same backend server)
3. **Optional**: Power users can configure local Ollama endpoint (advanced setting)

**Why Hybrid is Best**:
- ✓ Consistent experience across platforms
- ✓ Meets latency requirement (<3s for AI responses) with proper infrastructure
- ✓ Privacy-first option: Self-hosted Ollama backend under your control
- ✓ Cost-effective: Single backend serves all platforms
- ✓ Scalable: Add GPU instances as user base grows

**Implementation**:
```typescript
// Backend: Ollama service
import Ollama from 'ollama';

const ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://localhost:11434' });

export async function generateReply(messageContext: string): Promise<string[]> {
  const response = await ollama.chat({
    model: 'llama2:7b',
    messages: [
      { role: 'system', content: 'Generate 3 brief email reply suggestions.' },
      { role: 'user', content: messageContext }
    ],
    stream: false
  });

  return parseReplySuggestions(response.message.content);
}

// Flutter: API client
class OllamaService {
  final Dio _dio = Dio(BaseOptions(baseUrl: Config.backendUrl));

  Future<List<String>> generateReplies(String messageId) async {
    final response = await _dio.post('/api/ai/replies', data: {
      'message_id': messageId
    });
    return List<String>.from(response.data['suggestions']);
  }
}
```

**Latency Optimization** (<3s requirement):
- Use smaller, faster models: `llama2:7b` or `mistral:7b` (~1-2s inference)
- GPU acceleration: NVIDIA GPU reduces inference time by 5-10x
- Caching: Cache common prompts (e.g., priority scoring patterns)
- Streaming: Stream responses to show incremental results (perceived performance)
- Load balancing: Multiple Ollama instances behind load balancer for high traffic

**Privacy Considerations**:
- **Self-hosted backend**: Messages never leave your infrastructure (vs. OpenAI/Anthropic)
- **Data retention**: Implement auto-deletion of AI processing logs
- **Encryption**: TLS in transit, encrypt sensitive data at rest
- **User control**: Allow users to disable AI features if privacy-concerned

**Cost Analysis** (1000 concurrent users):
- **Scenario 1: Shared GPU VPS** ($100/month)
  - NVIDIA Tesla T4 or similar
  - Can handle ~10-20 concurrent inference requests
  - Sufficient for 1000 users (not all using AI simultaneously)
  - Queue requests during high load

- **Scenario 2: Scaling Strategy**:
  - Start: Single GPU instance ($100/month)
  - 100 concurrent users: Add 2nd instance + load balancer ($250/month)
  - 500 concurrent users: 3-4 instances ($400-500/month)
  - Cost per user: $0.10-0.50/month (much cheaper than OpenAI API at scale)

**Comparison to Cloud AI APIs**:
- **OpenAI GPT-4o-mini**: $0.15/1M input tokens, $0.60/1M output tokens
  - 1000 users × 100 AI requests/month × 1000 tokens = 100M tokens/month
  - Cost: ~$15-60/month (competitive with Ollama for small scale)
  - BUT: Privacy concerns, vendor lock-in, rate limits
- **Ollama**: Fixed infrastructure cost, unlimited requests, full privacy control
- **Break-even**: ~500 active users (Ollama becomes more cost-effective)

---

**Final Recommendation**:

**Phase 1 (MVP - P1)**:
- Cloud-hosted Ollama backend (single VPS with GPU, ~$50-100/month)
- All platforms (web/mobile) connect to backend API
- Use `llama2:7b` or `mistral:7b` for speed

**Phase 2 (Scaling - P2-P3)**:
- Add load balancer + multiple Ollama instances as user base grows
- Implement request queuing and caching

**Phase 3 (Advanced - P4+)**:
- Optional: Support for user-provided Ollama endpoints (power users)
- Consider hybrid: Cloud AI (OpenAI) for complex tasks, Ollama for simple tasks

**Deployment Tools**:
- **Docker**: Run Ollama in container for easy deployment
- **Docker Compose**: Ollama + Redis (queue) + PostgreSQL
- **Kubernetes**: For multi-instance scaling (overkill for MVP)
- **Monitoring**: Prometheus + Grafana to track inference latency

**Example Docker Compose**:
```yaml
services:
  ollama:
    image: ollama/ollama
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

  backend:
    build: ./backend
    environment:
      OLLAMA_HOST: http://ollama:11434
    depends_on:
      - ollama
      - postgres
    ports:
      - "3000:3000"
```

---

## 7. Push Notification Service

### Decision: Firebase Cloud Messaging (FCM) with APNs integration

**Rationale**:
- **Cross-platform support**: Single API for Android, iOS, and web
- **Free tier**: Unlimited messages (most cost-effective)
- **Flutter integration**: Excellent official package (`firebase_messaging`)
- **Reliability**: Google infrastructure, proven at scale
- **Background notifications**: Works when app is closed/background
- **Topic-based messaging**: Broadcast to user segments without managing device tokens manually

**Cross-Platform Support**:
- **Android**: Native FCM integration
- **iOS**: FCM forwards to APNs (Apple Push Notification Service) automatically
- **Web**: FCM supports web push via service workers

**Free Tier**:
- **Cost**: $0 for unlimited messages
- **No limits** on monthly active users or message volume
- **Contrast**: OneSignal free tier limited to 10,000 monthly active users

**Flutter Integration**:
- **Package**: `firebase_messaging`
- **Pub.dev Score**: 150/150
- **Popularity**: 11.5k likes (extremely popular)
- **Setup**: Minimal configuration, well-documented

**Implementation**:
```dart
import 'package:firebase_messaging/firebase_messaging.dart';

class NotificationService {
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;

  Future<void> initialize() async {
    // Request permission (iOS)
    NotificationSettings settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Get device token
    String? token = await _fcm.getToken();
    // Send token to backend
    await sendTokenToServer(token);

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      showLocalNotification(message);
    });

    // Handle background messages
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Handle notification taps
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      navigateToMessage(message.data['message_id']);
    });
  }
}

// Background handler (top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('Background message: ${message.messageId}');
}
```

**Backend Integration** (Node.js):
```typescript
import admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Send to specific device
await admin.messaging().send({
  token: userDeviceToken,
  notification: {
    title: 'New Message',
    body: 'You have a new high-priority email'
  },
  data: {
    message_id: '123',
    priority: 'high'
  },
  android: {
    priority: 'high'
  },
  apns: {
    headers: {
      'apns-priority': '10'
    }
  }
});

// Send to topic (all users subscribed)
await admin.messaging().send({
  topic: 'all_users',
  notification: {
    title: 'System Update',
    body: 'New features available'
  }
});
```

**Pros**:
- ✓ Free unlimited messages
- ✓ Excellent Flutter SDK (11.5k likes)
- ✓ Handles both FCM (Android) and APNs (iOS) with single API
- ✓ Topic-based messaging for broadcasts
- ✓ Data payloads for custom actions
- ✓ Google infrastructure reliability
- ✓ No server management (fully managed)

**Cons**:
- ✗ Requires Firebase project setup (adds Google dependency)
- ✗ Limited analytics compared to dedicated services
- ✗ Less advanced segmentation than OneSignal
- ✗ No built-in A/B testing for notifications

---

**Alternatives Considered**:

**APNs + FCM Separately**:
- **Approach**: Use Apple Push Notification Service directly for iOS, FCM for Android
- ✓ No middleman for iOS (direct APNs)
- ✗ **Two separate codebases** for notification logic
- ✗ **More complex**: Manage APNs certificates, device tokens separately
- ✗ **Web unsupported**: APNs is iOS-only
- **Verdict**: Violates simplicity principle, use FCM which handles APNs forwarding

**Custom WebSocket Solution**:
- **Approach**: Maintain persistent WebSocket connection for real-time notifications
- ✓ Real-time (no delay)
- ✓ Bidirectional communication
- ✓ No third-party dependency
- ✗ **Battery drain**: Persistent connection on mobile
- ✗ **Complex**: Must handle reconnection, offline scenarios
- ✗ **Background limitations**: iOS/Android restrict background WebSockets
- ✗ **No notification when app closed**: Requires hybrid with FCM anyway
- **Verdict**: Use WebSockets for in-app real-time updates, FCM for background/closed app notifications

**OneSignal**:
- **Approach**: Third-party notification service with unified API
- ✓ **Advanced features**: A/B testing, rich media, better analytics
- ✓ **Better segmentation**: Advanced user targeting
- ✓ **No-code tools**: Dashboard for sending notifications
- ✓ **Multi-channel**: Email + SMS + push in one platform
- ✗ **Cost**: Free tier limited to 10,000 monthly active users
  - Paid plans: $9/month for 100,000 MAU
  - At 1,000 users: Free tier sufficient
  - At 10,000+ users: $9-99/month
- ✗ **Vendor lock-in**: Harder to migrate than FCM
- ✗ **Less popular Flutter package**: `onesignal_flutter` (2.9k likes vs FCM's 11.5k)
- **Verdict**: Choose OneSignal if advanced targeting/analytics are critical and budget allows; otherwise FCM's unlimited free tier is better value

**Comparison Table**:

| Feature | FCM | APNs + FCM Separately | WebSocket Only | OneSignal |
|---------|-----|----------------------|----------------|-----------|
| Cost (1000 users) | Free | Free | Free (hosting) | Free |
| Cost (10K+ users) | Free | Free | Free (hosting) | $9-99/month |
| Cross-platform | ✓ All platforms | iOS + Android only | All platforms | ✓ All platforms |
| Flutter SDK Quality | Excellent (11.5k) | Medium (separate) | DIY | Good (2.9k) |
| Background Support | ✓ Native | ✓ Native | ✗ Limited | ✓ Native |
| Advanced Analytics | Basic | None | DIY | Excellent |
| User Segmentation | Basic (topics) | None | DIY | Advanced |
| Setup Complexity | Low | High | Very High | Low |
| Real-time (in-app) | Decent | Decent | Excellent | Decent |
| Vendor Lock-in | Medium (Firebase) | Low | None | High |

---

**Hybrid Approach (RECOMMENDED)**:

Combine FCM for notifications + WebSockets for real-time in-app updates:

**Architecture**:
1. **App in foreground**: WebSocket connection for instant message updates
2. **App in background/closed**: FCM delivers notifications
3. **Notification tap**: Deep link to specific message

**Implementation**:
```dart
class CommunicationService {
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  IOWebSocketChannel? _wsChannel;

  Future<void> initialize() async {
    // Initialize FCM for background notifications
    await _initializeFCM();

    // Connect WebSocket for real-time updates when app is active
    _connectWebSocket();

    // Listen for app lifecycle changes
    WidgetsBinding.instance.addObserver(this);
  }

  void _connectWebSocket() {
    _wsChannel = IOWebSocketChannel.connect('wss://api.example.com/ws');
    _wsChannel!.stream.listen((message) {
      // Handle real-time message updates
      final data = jsonDecode(message);
      if (data['type'] == 'new_message') {
        _updateInboxInRealTime(data['message']);
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      // App in background - close WebSocket, rely on FCM
      _wsChannel?.sink.close();
    } else if (state == AppLifecycleState.resumed) {
      // App back in foreground - reconnect WebSocket
      _connectWebSocket();
    }
  }
}
```

**Benefits of Hybrid**:
- Best of both worlds: Real-time when active, notifications when closed
- Battery efficient: WebSocket only when app is in use
- Reliable: FCM ensures users don't miss important messages
- User experience: Instant updates in-app, background notifications otherwise

**Smart Notification Logic**:
```typescript
// Backend: Only send FCM if user not active
async function sendNotification(userId: string, message: Message) {
  const isUserActive = await checkActiveWebSocket(userId);

  if (!isUserActive) {
    // User not connected via WebSocket, send FCM
    await admin.messaging().send({
      token: userDeviceToken,
      notification: {
        title: message.sender,
        body: message.preview
      },
      data: { message_id: message.id }
    });
  } else {
    // User is active, WebSocket will deliver real-time
    // Optionally send silent data message for redundancy
    await admin.messaging().send({
      token: userDeviceToken,
      data: { message_id: message.id },
      android: { priority: 'high' },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: { aps: { 'content-available': 1 } }
      }
    });
  }
}
```

---

**Final Recommendation**:

**For this project**: Use **Firebase Cloud Messaging (FCM)** as the primary notification service with WebSocket for in-app real-time updates.

**Rationale**:
- Meets all requirements: Cross-platform, free, reliable
- Excellent Flutter integration (official package)
- Simplest solution that works at scale
- Can migrate to OneSignal later if advanced features become necessary
- Hybrid approach (FCM + WebSocket) provides best user experience

**Implementation Priority**:
- **P1 (MVP)**: FCM basic notifications for new messages
- **P2**: WebSocket real-time updates for in-app experience
- **P3**: Smart notifications (quiet hours, batching) using FCM topics
- **P4+**: Consider OneSignal if advanced analytics/segmentation needed

---

## Summary: Technology Stack

| Component | Decision | Key Reason |
|-----------|----------|------------|
| **Email - Gmail** | `googleapis` package | Official Google package, full cross-platform |
| **Email - IMAP/Exchange** | `enough_mail` package | Comprehensive IMAP/SMTP, 140/140 pub.dev score |
| **Social - Facebook Messenger** | Direct API (defer to P3) | No package, complex approval, business-focused |
| **Social - Instagram DM** | Direct API (defer to P3) | Unified with Messenger API, business accounts only |
| **Messaging - WhatsApp** | Defer to P4 | Business API only, complex setup, high cost |
| **Messaging - TikTok** | Exclude | No API available |
| **Calendar - Outlook** | `microsoft_graph_api` | 150/150 pub.dev score, full MS Graph access |
| **State Management** | Riverpod 2.x | Best balance: testability, performance, DX |
| **Backend** | Node.js + Express (TypeScript) | OAuth2 ecosystem, Ollama support, team familiarity |
| **Database** | PostgreSQL (Supabase) | Real-time sync, cost-effective, excellent Flutter SDK |
| **AI Processing** | Ollama (cloud-hosted) | Privacy-first, cost-effective at scale, <3s latency |
| **Push Notifications** | Firebase Cloud Messaging | Free unlimited, cross-platform, excellent Flutter SDK |
| **Testing - OAuth** | Mock OAuth2 server | Fast, no credentials, consistent results |
| **Testing - APIs** | HTTP mocking (nock) | Unit tests, predictable, offline |
| **Testing - Contracts** | Pact or OpenAPI | Catch breaking changes, ensure compatibility |
| **Testing - E2E** | Playwright (web) | Reliable, cross-browser, good documentation |

---

## Constitutional Alignment

**Simplicity First**: ✓
- Chose proven, well-documented technologies over cutting-edge alternatives
- Single backend language (TypeScript) for consistency
- Managed services (Supabase, FCM) over self-hosted where appropriate
- Avoided unnecessary complexity (e.g., separate APNs implementation)

**Incremental Delivery**: ✓
- P1 focuses on email (Gmail, IMAP) with simpler integrations
- Social media and WhatsApp deferred to later phases
- TikTok excluded due to API unavailability
- Can launch MVP without all platforms

**Security by Default**: ✓
- OAuth2 for all third-party authentication
- Backend handles sensitive credentials (not Flutter client)
- PostgreSQL with encryption (Supabase)
- Ollama self-hosted for data privacy

**Test-Driven Development**: ✓
- Comprehensive testing strategy across all layers
- Mock servers for OAuth and API testing
- Contract testing to prevent breaking changes
- All frameworks chosen have excellent testing support

**Documentation as Code**: ✓
- OpenAPI for API contracts
- TypeScript types ensure documentation matches implementation
- This research document serves as living architecture documentation

---

## Next Steps

1. **Proceed to Phase 1**: Data Model & Contracts
   - Define PostgreSQL schema (users, messages, accounts, categories)
   - Create OpenAPI specification for backend API
   - Document Flutter-Backend contract with Pact

2. **Set up development environment**:
   - Initialize Node.js backend with Express + TypeScript
   - Create Flutter app structure with Riverpod
   - Set up Supabase project and configure realtime
   - Deploy Ollama to test VPS

3. **Implement P1 (MVP)**:
   - Gmail integration (`googleapis` package)
   - IMAP integration (`enough_mail` for mobile)
   - Unified inbox UI with Riverpod state management
   - Basic AI features (priority scoring via Ollama)
   - FCM notifications

4. **Defer to later phases**:
   - Facebook Messenger (P3)
   - Instagram DM (P3)
   - WhatsApp Business (P4)
   - TikTok (excluded)

**Estimated Timeline**:
- Phase 0 (Research): Complete ✓
- Phase 1 (Design): 1-2 weeks
- Phase 2 (Implementation - P1): 6-8 weeks
- Phase 3 (P2-P3 features): 8-12 weeks
- Phase 4 (P4-P5 features): 6-8 weeks

**Budget Estimate (Monthly)**:
- Supabase Pro: $30-40
- Ollama VPS (GPU): $50-100
- Firebase FCM: $0
- Domain + CDN: $10-20
- **Total**: ~$90-160/month for 1000 users

**Scaling Costs (10,000 users)**:
- Supabase: $100-150
- Ollama (3-4 instances): $200-400
- Firebase FCM: $0
- Infrastructure: $50-100
- **Total**: ~$350-650/month

---

*Document Status*: Complete - Ready for Phase 1
*Last Updated*: 2025-11-16
*Next Review*: After Phase 1 Design (Data Model & Contracts)