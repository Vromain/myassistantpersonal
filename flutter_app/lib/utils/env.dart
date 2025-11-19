/// Environment Configuration
/// Task: T004 - Create environment configuration file
///
/// Configuration for backend URLs and external services

class Env {
  // Backend API
  static const String backendUrl = 'http://localhost:3002';
  static const String apiBaseUrl = 'http://localhost:3002/api/v1';

  // Ollama AI endpoints
  static const String ollamaLocalUrl = 'http://localhost:11434';
  static const String ollamaRemoteUrl = 'http://94.23.49.185:11434';

  // OAuth redirect (for Gmail authentication)
  static const String oauthRedirectUrl = 'http://localhost:3002/api/v1/auth/gmail/callback';

  // App configuration
  static const String appName = 'AI Communication Hub';

  // OAuth credentials (placeholder - will be configured)
  static const String googleClientId = '';

  // Environment flags
  static const bool isDevelopment = true;
  static const bool enableLogging = true;
  static const bool enableDebugLogging = true;

  // Validate environment
  static void validate() {
    // Add validation logic if needed
  }
}
