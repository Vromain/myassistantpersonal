# Communication Hub - Flutter App

**Cross-platform mobile & web app for AI-Powered Communication Hub**

Built with Flutter 3.x, Riverpod, and Material Design 3.

## Features

- ✅ Gmail OAuth authentication
- ✅ Unified inbox across all platforms
- ✅ AI-powered priority scoring (0-100)
- ✅ Smart reply suggestions
- ✅ Full-text message search
- ✅ Priority filtering (High/Medium/Low)
- ✅ Unread filtering
- ✅ Pull-to-refresh sync
- ✅ Offline support (planned)
- ✅ Material Design 3 UI

## Quick Start

### Prerequisites

- Flutter SDK 3.0.0 or higher
- Dart SDK 3.0.0 or higher
- Backend API running (see `../backend/README.md`)

### Installation

```bash
# Get dependencies
flutter pub get

# Generate code (models, providers, API client)
flutter pub run build_runner build --delete-conflicting-outputs

# Run on web
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:3000/api/v1

# Run on mobile
flutter run --dart-define=API_BASE_URL=http://localhost:3000/api/v1
```

### Environment Variables

Pass environment variables using `--dart-define`:

```bash
flutter run \
  --dart-define=API_BASE_URL=http://localhost:3000/api/v1 \
  --dart-define=GOOGLE_CLIENT_ID=your-client-id \
  --dart-define=DEBUG=true
```

## Project Structure

```
flutter_app/
├── lib/
│   ├── main.dart                    # App entry point
│   ├── models/                      # Data models (Freezed)
│   │   ├── user.dart               # User model
│   │   ├── message.dart            # Message model
│   │   ├── category.dart           # Category model
│   │   ├── connected_account.dart  # Account model
│   │   └── auth.dart               # Auth state
│   ├── services/                    # Business logic
│   │   ├── api_client.dart         # Retrofit API client
│   │   ├── dio_client.dart         # Dio configuration
│   │   ├── auth_repository.dart    # Auth service
│   │   └── message_repository.dart # Message service
│   ├── providers/                   # Riverpod providers
│   │   ├── auth_provider.dart      # Auth state management
│   │   └── messages_provider.dart  # Messages state management
│   ├── screens/                     # UI screens
│   │   ├── login_screen.dart       # Login with Gmail
│   │   ├── inbox_screen.dart       # Message list
│   │   └── message_detail_screen.dart # Message details
│   ├── widgets/                     # Reusable widgets
│   │   ├── message_card.dart       # Message list item
│   │   ├── priority_badge.dart     # Priority indicator
│   │   └── priority_filter.dart    # Filter chips
│   └── utils/
│       └── env.dart                 # Environment config
├── pubspec.yaml                     # Dependencies
└── analysis_options.yaml            # Linter rules
```

## Code Generation

This project uses code generation for:

- **Freezed**: Immutable models with copyWith, equality
- **json_serializable**: JSON serialization
- **Riverpod**: Provider generation
- **Retrofit**: Type-safe API client

Run code generation:

```bash
# Watch mode (rebuilds on changes)
flutter pub run build_runner watch

# One-time build
flutter pub run build_runner build --delete-conflicting-outputs
```

## Architecture

### State Management

Using **Riverpod 2.x** with code generation:

- `AuthProvider`: Manages authentication state
- `MessagesProvider`: Manages message list, filtering, search
- `UnreadCountProvider`: Tracks unread count
- `MessageDetailProvider`: Single message details

### Data Flow

```
UI Screen
  ↓ (watches)
Provider (Riverpod)
  ↓ (calls)
Repository
  ↓ (HTTP)
API Client (Retrofit + Dio)
  ↓
Backend API
```

### Models

All models use **Freezed** for:
- Immutability
- `copyWith` method
- Equality comparison
- JSON serialization

Example:
```dart
@freezed
class Message with _$Message {
  const factory Message({
    required String id,
    required String content,
    // ...
  }) = _Message;

  factory Message.fromJson(Map<String, dynamic> json) =>
      _$MessageFromJson(json);
}
```

## Features Implementation

### Authentication

- Gmail OAuth via `flutter_web_auth_2`
- JWT token storage in `flutter_secure_storage`
- Auto token refresh
- Automatic redirection based on auth state

### Messages

- **Inbox**: Paginated message list with pull-to-refresh
- **Search**: Full-text search with dedicated UI
- **Filters**: Priority, read status, platform
- **Detail View**: Full message with AI reply suggestions
- **Actions**: Mark as read, archive, categorize

### UI Components

- **MessageCard**: Displays message preview with priority
- **PriorityBadge**: Color-coded priority indicator
- **PriorityFilter**: Filter chips for priority levels
- Material Design 3 theming

## API Integration

API client generated with Retrofit:

```dart
@RestApi()
abstract class ApiClient {
  factory ApiClient(Dio dio, {String baseUrl}) = _ApiClient;

  @GET('/messages')
  Future<MessageListResponse> getMessages({
    @Query('page') int? page,
    @Query('limit') int? limit,
    // ...
  });
}
```

## Testing

```bash
# Run unit tests
flutter test

# Run with coverage
flutter test --coverage

# View coverage
genhtml coverage/lcov.info -o coverage/html
open coverage/html/index.html
```

## Building for Production

### Web

```bash
flutter build web \
  --release \
  --dart-define=API_BASE_URL=https://api.yourapp.com/api/v1
```

### Android

```bash
flutter build apk \
  --release \
  --dart-define=API_BASE_URL=https://api.yourapp.com/api/v1
```

### iOS

```bash
flutter build ios \
  --release \
  --dart-define=API_BASE_URL=https://api.yourapp.com/api/v1
```

## Dependencies

### Core
- `flutter_riverpod`: State management
- `go_router`: Declarative routing
- `freezed`: Immutable models

### Network
- `dio`: HTTP client
- `retrofit`: Type-safe API client
- `json_serializable`: JSON parsing

### UI
- `cached_network_image`: Image caching
- `shimmer`: Loading placeholders
- `pull_to_refresh`: Pull-to-refresh
- `timeago`: Relative timestamps

### Storage
- `flutter_secure_storage`: Secure token storage
- `shared_preferences`: Simple key-value storage
- `sqflite`: Local SQLite database (planned)

### Auth
- `google_sign_in`: Google OAuth (native)
- `flutter_web_auth_2`: Web OAuth flow

## Troubleshooting

### Code generation errors

```bash
# Clean and regenerate
flutter clean
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

### API connection issues

Check `lib/utils/env.dart` and ensure `API_BASE_URL` is correct:

```dart
static const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:3000/api/v1',
);
```

### OAuth redirect issues

Ensure the callback URL scheme matches in:
- `android/app/src/main/AndroidManifest.xml`
- `ios/Runner/Info.plist`
- Backend configuration

## Next Steps

- [ ] Implement offline sync with SQLite
- [ ] Add push notifications
- [ ] Implement compose/reply functionality
- [ ] Add attachment download/preview
- [ ] Implement Exchange/IMAP support
- [ ] Add calendar integration
- [ ] Implement social media platforms

## License

MIT
