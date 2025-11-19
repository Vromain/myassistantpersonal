import 'package:freezed_annotation/freezed_annotation.dart';

part 'notification_preferences.freezed.dart';
part 'notification_preferences.g.dart';

/// Notification Preferences Model
/// Task: T065 - APNs device registration
/// Reference: specs/001-ai-communication-hub/data-model.md

@freezed
class NotificationPreferences with _$NotificationPreferences {
  const factory NotificationPreferences({
    QuietHours? quietHours,
    @Default([]) List<NotificationRule> notificationRules,
    @Default(90) int dataRetentionDays,
  }) = _NotificationPreferences;

  factory NotificationPreferences.fromJson(Map<String, dynamic> json) =>
      _$NotificationPreferencesFromJson(json);
}

@freezed
class QuietHours with _$QuietHours {
  const factory QuietHours({
    @Default(false) bool enabled,
    @Default('22:00') String startTime,
    @Default('07:00') String endTime,
    @Default('UTC') String timezone,
  }) = _QuietHours;

  factory QuietHours.fromJson(Map<String, dynamic> json) =>
      _$QuietHoursFromJson(json);
}

@freezed
class NotificationRule with _$NotificationRule {
  const factory NotificationRule({
    @Default('medium') String priorityThreshold,
    @Default(true) bool enabled,
    @Default([]) List<String> keywords,
  }) = _NotificationRule;

  factory NotificationRule.fromJson(Map<String, dynamic> json) =>
      _$NotificationRuleFromJson(json);
}
