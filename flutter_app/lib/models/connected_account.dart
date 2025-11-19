import 'package:freezed_annotation/freezed_annotation.dart';
import 'message.dart';

part 'connected_account.freezed.dart';
part 'connected_account.g.dart';

/// Connected Account Model
/// Task: T028 - Create Dart models
/// Reference: specs/001-ai-communication-hub/data-model.md

enum SyncStatus {
  active,
  paused,
  syncing,
  error,
}

@freezed
class ConnectedAccount with _$ConnectedAccount {
  const ConnectedAccount._();

  const factory ConnectedAccount({
    required String id,
    required String userId,
    required Platform platform,
    required String email,
    String? displayName,
    required SyncStatus syncStatus,
    required ConnectionHealth connectionHealth,
    required SyncSettings syncSettings,
    DateTime? lastSyncedAt,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _ConnectedAccount;

  factory ConnectedAccount.fromJson(Map<String, dynamic> json) =>
      _$ConnectedAccountFromJson(json);

  // Computed properties
  bool get isHealthy => connectionHealth.isHealthy;
  bool get isSyncing => syncStatus == SyncStatus.syncing;
  bool get hasError => syncStatus == SyncStatus.error;
  bool get isPaused => syncStatus == SyncStatus.paused;

  String get displayNameOrEmail => displayName ?? email;

  String get platformIcon {
    switch (platform) {
      case Platform.gmail:
        return '📧';
      case Platform.exchange:
        return '📨';
      case Platform.imap:
        return '✉️';
      case Platform.facebook:
        return '📘';
      case Platform.instagram:
        return '📷';
      case Platform.whatsapp:
        return '💬';
      case Platform.twitter:
        return '🐦';
    }
  }
}

@freezed
class ConnectionHealth with _$ConnectionHealth {
  const factory ConnectionHealth({
    required bool isHealthy,
    required DateTime lastChecked,
    String? errorMessage,
  }) = _ConnectionHealth;

  factory ConnectionHealth.fromJson(Map<String, dynamic> json) =>
      _$ConnectionHealthFromJson(json);
}

@freezed
class SyncSettings with _$SyncSettings {
  const factory SyncSettings({
    @Default(true) bool enabled,
    @Default(300) int frequency, // seconds
    DateTime? syncFrom,
  }) = _SyncSettings;

  factory SyncSettings.fromJson(Map<String, dynamic> json) =>
      _$SyncSettingsFromJson(json);
}
