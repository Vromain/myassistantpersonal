import 'package:freezed_annotation/freezed_annotation.dart';

part 'service_health.freezed.dart';
part 'service_health.g.dart';

/// Service Health Model
/// Task: T013 - Create ServiceHealth model
/// Feature: 002-intelligent-message-analysis

enum ServiceStatus {
  online,
  offline,
  degraded,
}

@freezed
class ServiceHealth with _$ServiceHealth {
  const ServiceHealth._();

  const factory ServiceHealth({
    required String serviceName,
    required ServiceStatus status,
    String? endpoint,
    int? responseTime,
    required DateTime lastCheckTimestamp,
    String? errorMessage,
    Map<String, dynamic>? metadata,
  }) = _ServiceHealth;

  factory ServiceHealth.fromJson(Map<String, dynamic> json) =>
      _$ServiceHealthFromJson(json);

  // Computed properties
  bool get isOnline => status == ServiceStatus.online;
  bool get isOffline => status == ServiceStatus.offline;
  bool get isDegraded => status == ServiceStatus.degraded;

  String get statusDisplay {
    switch (status) {
      case ServiceStatus.online:
        return 'En ligne';
      case ServiceStatus.offline:
        return 'Hors ligne';
      case ServiceStatus.degraded:
        return 'Dégradé';
    }
  }

  String get statusIcon {
    switch (status) {
      case ServiceStatus.online:
        return '✅';
      case ServiceStatus.offline:
        return '❌';
      case ServiceStatus.degraded:
        return '⚠️';
    }
  }
}

@freezed
class ServicesHealthResponse with _$ServicesHealthResponse {
  const factory ServicesHealthResponse({
    required bool success,
    required String timestamp,
    required ServicesHealth services,
  }) = _ServicesHealthResponse;

  factory ServicesHealthResponse.fromJson(Map<String, dynamic> json) =>
      _$ServicesHealthResponseFromJson(json);
}

@freezed
class ServicesHealth with _$ServicesHealth {
  const factory ServicesHealth({
    required ServiceHealth backend,
    required ServiceHealth ollama,
  }) = _ServicesHealth;

  factory ServicesHealth.fromJson(Map<String, dynamic> json) =>
      _$ServicesHealthFromJson(json);
}
