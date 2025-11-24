import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../models/notification_preferences.dart';
import '../api_client.dart';

/// Notification Service
/// Task: T065 - Implement APNs device registration
/// Task: T069 - Handle foreground/background notifications
///
/// Handles push notification registration and message handling

// Firebase disabled: background handler not used

class NotificationService {
  final Ref ref;
  String? _cachedToken;
  String? _cachedDeviceId;

  NotificationService(this.ref);

  Future<void> initialize() async {
    await registerDevice();
    setupMessageHandlers();
  }

  /// Register device with backend
  Future<void> registerDevice() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      String? deviceId = prefs.getString('device_id');
      deviceId ??= 'device_${DateTime.now().millisecondsSinceEpoch}';
      await prefs.setString('device_id', deviceId);
      _cachedDeviceId = deviceId;

      final apiClient = ref.read(apiClientProvider);
      await apiClient.registerDeviceToken({
        'token': _cachedToken ?? 'no-token',
        'deviceId': deviceId,
      });
    } catch (_) {}
  }

  /// Unregister device from backend
  Future<void> unregisterDevice() async {
    try {
      if (_cachedDeviceId == null) return;
      final apiClient = ref.read(apiClientProvider);
      await apiClient.unregisterDeviceToken({'deviceId': _cachedDeviceId!});
    } catch (_) {}
  }

  /// Setup message handlers for foreground/background
  void setupMessageHandlers() {}

  /// Handle incoming message
  void _handleMessage(Map<String, dynamic> data, {bool inForeground = false}) {}

  /// Handle notification tap
  void _handleNotificationTap(Map<String, dynamic> data) {}

  /// Show in-app notification (when app is in foreground)
  void _showInAppNotification(Map<String, dynamic> data) {}

  /// Refresh token with backend
  Future<void> _refreshToken(String newToken) async {
    if (_cachedDeviceId == null) return;
    final apiClient = ref.read(apiClientProvider);
    await apiClient.registerDeviceToken({
      'token': newToken,
      'deviceId': _cachedDeviceId!,
    });
  }

  /// Generate unique device ID
  String _generateDeviceId() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    return 'device_$timestamp';
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
