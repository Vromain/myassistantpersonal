import 'dart:convert';
import 'package:http/http.dart' as http;
import '../utils/env.dart';
import '../models/user_settings.dart';
import 'auth_service.dart';

/// Settings Service
/// Tasks: T058, T059 - Create SettingsService methods
/// Reference: specs/002-intelligent-message-analysis/spec.md FR-008, FR-009
///
/// Provides methods to fetch and update user settings from the backend

class SettingsService {
  /// Get user settings from backend
  /// Task: T058 - Create SettingsService.getUserSettings method
  static Future<UserSettings?> getUserSettings() async {
    try {
      final token = await AuthService.getToken();
      if (token == null) {
        throw Exception('Not authenticated');
      }

      final response = await http.get(
        Uri.parse('${Env.apiBaseUrl}/settings'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return UserSettings.fromJson(data);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized');
      } else {
        final data = jsonDecode(response.body);
        throw Exception(data['message'] ?? 'Failed to get settings');
      }
    } catch (e) {
      print('❌ Error getting settings: $e');
      rethrow;
    }
  }

  /// Update user settings in backend
  /// Task: T059 - Create SettingsService.updateUserSettings method
  static Future<UserSettings?> updateUserSettings(
      UserSettings settings) async {
    try {
      final token = await AuthService.getToken();
      if (token == null) {
        throw Exception('Not authenticated');
      }

      final response = await http.put(
        Uri.parse('${Env.apiBaseUrl}/settings'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'autoDeleteSpamEnabled': settings.autoDeleteSpamEnabled,
          'autoSendRepliesEnabled': settings.autoSendRepliesEnabled,
          'spamThreshold': settings.spamThreshold,
          'responseConfidenceThreshold': settings.responseConfidenceThreshold,
          'senderWhitelist': settings.senderWhitelist,
          'senderBlacklist': settings.senderBlacklist,
          'businessHoursOnly': settings.businessHoursOnly,
          'maxRepliesPerDay': settings.maxRepliesPerDay,
          'dailySummaryEnabled': settings.dailySummaryEnabled,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        // Backend returns nested response with settings object
        if (data['settings'] != null) {
          return UserSettings.fromJson(data['settings']);
        }
        return UserSettings.fromJson(data);
      } else if (response.statusCode == 401) {
        throw Exception('Unauthorized');
      } else {
        final data = jsonDecode(response.body);
        throw Exception(data['message'] ?? 'Failed to update settings');
      }
    } catch (e) {
      print('❌ Error updating settings: $e');
      rethrow;
    }
  }
}
