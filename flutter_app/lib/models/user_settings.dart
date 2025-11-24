import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_settings.freezed.dart';
part 'user_settings.g.dart';

/// User Settings Model
/// Task: T056 - Create UserSettings Freezed model
/// Reference: specs/002-intelligent-message-analysis/spec.md FR-008, FR-009
///
/// Contains all user preferences for message management:
/// - Auto-delete spam settings
/// - Auto-reply settings with conditions
/// - Daily summary email preferences

@freezed
class UserSettings with _$UserSettings {
  const UserSettings._();

  const factory UserSettings({
    required String userId,
    // Auto-delete spam settings (FR-008)
    @Default(false) bool autoDeleteSpamEnabled,
    @Default(80) int spamThreshold, // Percentage 0-100

    // Auto-reply settings (FR-009)
    @Default(false) bool autoSendRepliesEnabled,
    @Default(85) int responseConfidenceThreshold, // Percentage 0-100

    // Auto-reply conditions (FR-009)
    @Default([]) List<String> senderWhitelist,
    @Default([]) List<String> senderBlacklist,
    @Default(false) bool businessHoursOnly,
    @Default(10) int maxRepliesPerDay,

    // Daily summary email (FR-008, FR-009)
    @Default(true) bool dailySummaryEnabled,

    // Metadata
    DateTime? lastUpdated,
    DateTime? createdAt,
  }) = _UserSettings;

  factory UserSettings.fromJson(Map<String, dynamic> json) =>
      _$UserSettingsFromJson(json);

  /// Create default settings for a new user
  factory UserSettings.defaultSettings(String userId) => UserSettings(
        userId: userId,
        createdAt: DateTime.now(),
        lastUpdated: DateTime.now(),
      );

  /// Check if current time is within business hours
  /// Business hours: Monday-Friday, 9 AM - 5 PM
  bool isWithinBusinessHours(DateTime timestamp) {
    if (!businessHoursOnly) return true;

    final weekday = timestamp.weekday;
    final hour = timestamp.hour;

    // Monday = 1, Friday = 5
    final isWeekday = weekday >= 1 && weekday <= 5;
    final isBusinessHour = hour >= 9 && hour < 17;

    return isWeekday && isBusinessHour;
  }

  /// Check if sender is allowed for auto-reply
  bool isSenderAllowedForAutoReply(String senderEmail) {
    // If sender is in blacklist, deny
    if (senderBlacklist.contains(senderEmail.toLowerCase())) {
      return false;
    }

    // If whitelist is not empty and sender is not in whitelist, deny
    if (senderWhitelist.isNotEmpty &&
        !senderWhitelist.contains(senderEmail.toLowerCase())) {
      return false;
    }

    return true;
  }
}
