import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../services/api_client.dart';

part 'dashboard_provider.g.dart';

class DashboardStatsData {
  final int totalMessages;
  final int spamDetected;
  final int trashedMessages;
  final int autoDeletedMessages;
  final int repliesGenerated;
  final int needsResponse;
  const DashboardStatsData({
    required this.totalMessages,
    required this.spamDetected,
    required this.trashedMessages,
    required this.autoDeletedMessages,
    required this.repliesGenerated,
    required this.needsResponse,
  });
}

@riverpod
Future<DashboardStatsData> dashboardStats(DashboardStatsRef ref) async {
  final api = ref.read(apiClientProvider);
  final resp = await api.getDashboardStats();
  final stats = (resp['stats'] ?? resp) as Map<String, dynamic>;
  return DashboardStatsData(
    totalMessages: (stats['totalMessages'] ?? 0) as int,
    trashedMessages: (stats['trashedMessages'] ?? 0) as int,
    autoDeletedMessages: (stats['autoDeletedMessages'] ?? 0) as int,
    spamDetected: (stats['spamDetected'] ?? 0) as int,
    repliesGenerated: (stats['repliesGenerated'] ?? 0) as int,
    needsResponse: (stats['needsResponse'] ?? 0) as int,
  );
}
