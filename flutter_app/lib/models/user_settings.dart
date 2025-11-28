import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_settings.freezed.dart';
part 'user_settings.g.dart';

@freezed
class UserSettings with _$UserSettings {
  const factory UserSettings({
    required String userId,
    @Default(false) bool autoDeleteSpamEnabled,
    @Default(false) bool autoSendRepliesEnabled,
    @Default(80) int spamThreshold,
    @Default(85) int responseConfidenceThreshold,
    @Default([]) List<String> senderWhitelist,
    @Default([]) List<String> senderBlacklist,
    @Default(false) bool businessHoursOnly,
    @Default(10) int maxRepliesPerDay,
    @Default(false) bool dailySummaryEnabled,
    DateTime? lastUpdated,
    DateTime? createdAt,
  }) = _UserSettings;

  factory UserSettings.fromJson(Map<String, dynamic> json) =>
      _$UserSettingsFromJson(json);
}
