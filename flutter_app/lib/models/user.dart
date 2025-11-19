import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';

/// User Model
/// Task: T028 - Create Dart models
/// Reference: specs/001-ai-communication-hub/data-model.md

@freezed
class User with _$User {
  const factory User({
    required String id,
    required String email,
    @Default('free') String subscriptionTier,
    required UserPreferences preferences,
    @Default([]) List<String> connectedAccountIds,
    DateTime? lastLoginAt,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}

@freezed
class UserPreferences with _$UserPreferences {
  const factory UserPreferences({
    required QuietHours quietHours,
    required NotificationRules notificationRules,
    @Default(false) bool autoReplyEnabled,
    String? autoReplyMessage,
    @Default(90) int dataRetention,
  }) = _UserPreferences;

  factory UserPreferences.fromJson(Map<String, dynamic> json) =>
      _$UserPreferencesFromJson(json);

  factory UserPreferences.defaults() => const UserPreferences(
        quietHours: QuietHours(
          enabled: false,
          start: '22:00',
          end: '08:00',
        ),
        notificationRules: NotificationRules(
          email: true,
          push: true,
          sms: false,
        ),
      );
}

@freezed
class QuietHours with _$QuietHours {
  const factory QuietHours({
    required bool enabled,
    required String start,
    required String end,
  }) = _QuietHours;

  factory QuietHours.fromJson(Map<String, dynamic> json) =>
      _$QuietHoursFromJson(json);
}

@freezed
class NotificationRules with _$NotificationRules {
  const factory NotificationRules({
    required bool email,
    required bool push,
    required bool sms,
  }) = _NotificationRules;

  factory NotificationRules.fromJson(Map<String, dynamic> json) =>
      _$NotificationRulesFromJson(json);
}
