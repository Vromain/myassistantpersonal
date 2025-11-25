/// Environment Configuration
/// Task: T004 - Create environment configuration file
///
/// Configuration for backend URLs and external services
library;

import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class Env {
  // Get the appropriate base URL depending on the platform
  static String get _baseHost {
    if (kIsWeb) {
      // Web: use localhost
      return 'localhost';
    } else if (Platform.isAndroid) {
      // Android emulator: use special IP to access host machine
      return '10.0.2.2';
    } else {
      // iOS simulator and other platforms: use localhost
      return 'localhost';
    }
  }

  // Backend API
  static String get backendUrl => 'http://$_baseHost:3003';
  static String get apiBaseUrl => 'http://$_baseHost:3003/api/v1';

  // Ollama AI endpoints
  static String get ollamaLocalUrl => 'http://$_baseHost:11434';
  static const String ollamaRemoteUrl = 'http://94.23.49.185:11434';

  // OAuth redirect (for Gmail authentication)
  static const String oauthRedirectUrl = 'http://localhost:3003/api/v1/auth/gmail/callback';

  // App configuration
  static const String appName = 'AI Communication Hub';

  // OAuth credentials (placeholder - will be configured)
  static const String googleClientId = '415167970554-3d8c6g2no5qqhunpj9njs7phfh09j5g7.apps.googleusercontent.com';

  // Environment flags
  static const bool isDevelopment = true;
  static const bool enableLogging = true;
  static const bool enableDebugLogging = true;

  // Validate environment
  static void validate() {
    // Add validation logic if needed
  }
}
