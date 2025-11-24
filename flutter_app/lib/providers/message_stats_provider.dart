import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/message.dart';
import 'messages_provider.dart';

/// Message Statistics Model
/// Task: T049 - Create message statistics provider for aggregating statistics
/// Reference: specs/002-intelligent-message-analysis/spec.md FR-005
class MessageStats {
  final int totalMessages;
  final int spamMessages;
  final double spamPercentage;
  final int messagesNeedingResponse;
  final int autoRepliedMessages;

  const MessageStats({
    required this.totalMessages,
    required this.spamMessages,
    required this.spamPercentage,
    required this.messagesNeedingResponse,
    this.autoRepliedMessages = 0,
  });

  const MessageStats.empty()
      : totalMessages = 0,
        spamMessages = 0,
        spamPercentage = 0.0,
        messagesNeedingResponse = 0,
        autoRepliedMessages = 0;
}

/// Provider for message statistics
/// Watches messagesProvider and computes aggregated statistics
final messageStatsProvider = Provider<MessageStats>((ref) {
  final messagesAsync = ref.watch(messagesProvider);

  return messagesAsync.when(
    data: (messageListResponse) {
      final messages = messageListResponse.messages;

      if (messages.isEmpty) {
        return const MessageStats.empty();
      }

      // Count spam messages (using priority level as proxy for spam detection)
      // In a full implementation, this would check MessageAnalysis.isSpam
      final spamCount = messages
          .where((msg) =>
              msg.priorityLevel == PriorityLevel.low &&
              (msg.subject?.toLowerCase() ?? '').contains('spam'))
          .length;

      // Count messages needing response (high priority messages)
      final needsResponseCount =
          messages.where((msg) => msg.priorityLevel == PriorityLevel.high).length;

      // Calculate spam percentage
      final spamPercentage =
          messages.isNotEmpty ? (spamCount / messages.length) * 100 : 0.0;

      return MessageStats(
        totalMessages: messages.length,
        spamMessages: spamCount,
        spamPercentage: spamPercentage,
        messagesNeedingResponse: needsResponseCount,
        autoRepliedMessages: 0, // TODO: Track auto-replied messages in future
      );
    },
    loading: () => const MessageStats.empty(),
    error: (_, __) => const MessageStats.empty(),
  );
});
