import 'dart:async';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../models/notification_preferences.dart';
import '../api_client.dart';

/// Notification Service
/// Task: T065 - Implement APNs device registration
/// Task: T069 - Handle foreground/background notifications
///
/// Handles push notification registration and message handling

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  print('📱 Background message received: ${message.messageId}');
}

class NotificationService {
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final Ref ref;
  String? _cachedToken;
  String? _cachedDeviceId;

  NotificationService(this.ref);

  /// Initialize Firebase and request notification permissions
  Future<void> initialize() async {
    try {
      // Initialize Firebase
      await Firebase.initializeApp();
      print('✅ Firebase initialized');

      // Request permissions (iOS)
      final settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        print('✅ Notification permissions granted');
      } else if (settings.authorizationStatus == AuthorizationStatus.provisional) {
        print('⚠️  Provisional notification permissions granted');
      } else {
        print('❌ Notification permissions denied');
        return;
      }

      // Register device token
      await registerDevice();

      // Set up message handlers
      setupMessageHandlers();

      // Set background message handler
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

      print('✅ Notification service initialized');
    } catch (error) {
      print('❌ Failed to initialize notifications: $error');
    }
  }

  /// Register device with backend
  Future<void> registerDevice() async {
    try {
      // Get FCM/APNs token
      final token = await _messaging.getToken();

      if (token == null) {
        print('❌ Failed to get device token');
        return;
      }

      _cachedToken = token;

      // Generate or retrieve device ID
      final prefs = await SharedPreferences.getInstance();
      String? deviceId = prefs.getString('device_id');

      if (deviceId == null) {
        deviceId = _generateDeviceId();
        await prefs.setString('device_id', deviceId);
      }

      _cachedDeviceId = deviceId;

      // Register with backend
      final apiClient = ref.read(apiClientProvider);
      await apiClient.registerDeviceToken({
        'token': token,
        'deviceId': deviceId,
      });

      print('✅ Device registered: $deviceId');

      // Listen for token refresh
      _messaging.onTokenRefresh.listen((newToken) {
        _cachedToken = newToken;
        _refreshToken(newToken);
      });
    } catch (error) {
      print('❌ Failed to register device: $error');
    }
  }

  /// Unregister device from backend
  Future<void> unregisterDevice() async {
    try {
      if (_cachedDeviceId == null) {
        print('⚠️  No device ID to unregister');
        return;
      }

      final apiClient = ref.read(apiClientProvider);
      await apiClient.unregisterDeviceToken({
        'deviceId': _cachedDeviceId!,
      });

      print('✅ Device unregistered');
    } catch (error) {
      print('❌ Failed to unregister device: $error');
    }
  }

  /// Setup message handlers for foreground/background
  void setupMessageHandlers() {
    // Handle messages when app is in foreground
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('📱 Foreground message received: ${message.messageId}');
      _handleMessage(message, inForeground: true);
    });

    // Handle notification tap when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('📱 Notification opened: ${message.messageId}');
      _handleNotificationTap(message);
    });

    // Check if app was opened from terminated state
    _messaging.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        print('📱 App opened from notification: ${message.messageId}');
        _handleNotificationTap(message);
      }
    });
  }

  /// Handle incoming message
  void _handleMessage(RemoteMessage message, {bool inForeground = false}) {
    final notification = message.notification;
    final data = message.data;

    print('Message data: $data');

    if (notification != null) {
      print('Notification: ${notification.title} - ${notification.body}');

      if (inForeground) {
        // Show in-app notification UI
        _showInAppNotification(notification, data);
      }
    }

    // Update badge count if provided
    if (data.containsKey('badge')) {
      final badge = int.tryParse(data['badge'].toString());
      if (badge != null) {
        _messaging.setApplicationIconBadgeNumber(badge);
      }
    }
  }

  /// Handle notification tap
  void _handleNotificationTap(RemoteMessage message) {
    final data = message.data;

    // Navigate to message detail if messageId provided
    if (data.containsKey('messageId')) {
      final messageId = data['messageId'] as String;
      print('Navigate to message: $messageId');

      // Navigation will be handled by router
      // This would typically use go_router navigation
      // Example: ref.read(routerProvider).go('/messages/$messageId');
    }
  }

  /// Show in-app notification (when app is in foreground)
  void _showInAppNotification(RemoteNotification notification, Map<String, dynamic> data) {
    // This would show a banner/snackbar in the app
    // Implementation depends on your UI framework
    print('Show in-app: ${notification.title}');
  }

  /// Refresh token with backend
  Future<void> _refreshToken(String newToken) async {
    try {
      if (_cachedDeviceId == null) return;

      final apiClient = ref.read(apiClientProvider);
      await apiClient.registerDeviceToken({
        'token': newToken,
        'deviceId': _cachedDeviceId!,
      });

      print('✅ Token refreshed');
    } catch (error) {
      print('❌ Failed to refresh token: $error');
    }
  }

  /// Generate unique device ID
  String _generateDeviceId() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = timestamp.hashCode;
    return 'device_${Platform.operatingSystem}_$random';
  }

  /// Get notification preferences from backend
  Future<NotificationPreferences?> getPreferences() async {
    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.getNotificationPreferences();

      if (response['success'] == true && response['preferences'] != null) {
        return NotificationPreferences.fromJson(response['preferences']);
      }

      return null;
    } catch (error) {
      print('❌ Failed to get preferences: $error');
      return null;
    }
  }

  /// Update notification preferences
  Future<bool> updatePreferences(NotificationPreferences preferences) async {
    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.updateNotificationPreferences(
        preferences.toJson(),
      );

      return response['success'] == true;
    } catch (error) {
      print('❌ Failed to update preferences: $error');
      return false;
    }
  }

  /// Get current FCM token
  String? get currentToken => _cachedToken;

  /// Get current device ID
  String? get currentDeviceId => _cachedDeviceId;
}

/// Provider for notification service
final notificationServiceProvider = Provider<NotificationService>((ref) {
  return NotificationService(ref);
});
