import 'package:freezed_annotation/freezed_annotation.dart';

part 'message.freezed.dart';
part 'message.g.dart';

/// Message Model
/// Task: T028 - Create Dart models
/// Reference: specs/001-ai-communication-hub/data-model.md

enum Platform {
  gmail,
  exchange,
  imap,
  facebook,
  instagram,
  whatsapp,
  twitter,
}

enum PriorityLevel {
  high,
  medium,
  low,
}

@freezed
class Message with _$Message {
  const Message._();

  const factory Message({
    required String id,
    required String accountId,
    required String externalId,
    required Platform platform,
    required String sender,
    required String recipient,
    String? subject,
    required String content,
    required DateTime timestamp,
    @Default(false) bool readStatus,
    @Default(50) int priorityScore,
    @Default(PriorityLevel.medium) PriorityLevel priorityLevel,
    String? categoryId,
    @Default([]) List<Attachment> attachments,
    @Default(false) bool isUrgent,
    Map<String, dynamic>? metadata,
    DateTime? archivedAt,
  }) = _Message;

  factory Message.fromJson(Map<String, dynamic> json) =>
      _$MessageFromJson(json);

  // Computed properties
  bool get isArchived => archivedAt != null;
  bool get hasAttachments => attachments.isNotEmpty;
  bool get isHighPriority => priorityLevel == PriorityLevel.high;

  String get preview {
    if (content.length <= 100) return content;
    return '${content.substring(0, 100)}...';
  }

  String get senderName {
    // Extract name from email format "Name <email@domain.com>"
    final match = RegExp(r'^([^<]+)').firstMatch(sender);
    if (match != null) {
      return match.group(1)?.trim() ?? sender;
    }
    return sender;
  }

  String get senderEmail {
    // Extract email from format "Name <email@domain.com>"
    final match = RegExp(r'<([^>]+)>').firstMatch(sender);
    if (match != null) {
      return match.group(1) ?? sender;
    }
    return sender;
  }
}

@freezed
class Attachment with _$Attachment {
  const factory Attachment({
    required String filename,
    required String mimeType,
    required int size,
    String? url,
    String? attachmentId,
  }) = _Attachment;

  factory Attachment.fromJson(Map<String, dynamic> json) =>
      _$AttachmentFromJson(json);
}

@freezed
class MessageListResponse with _$MessageListResponse {
  const factory MessageListResponse({
    required List<Message> messages,
    required int total,
    required int page,
    required int limit,
    required bool hasMore,
    required MessageStats stats,
  }) = _MessageListResponse;

  factory MessageListResponse.fromJson(Map<String, dynamic> json) =>
      _$MessageListResponseFromJson(json);
}

@freezed
class MessageStats with _$MessageStats {
  const factory MessageStats({
    required int unreadCount,
    required int urgentCount,
    required PriorityStats byPriority,
    required Map<String, int> byPlatform,
  }) = _MessageStats;

  factory MessageStats.fromJson(Map<String, dynamic> json) =>
      _$MessageStatsFromJson(json);

  factory MessageStats.empty() => const MessageStats(
        unreadCount: 0,
        urgentCount: 0,
        byPriority: PriorityStats(high: 0, medium: 0, low: 0),
        byPlatform: {},
      );
}

@freezed
class PriorityStats with _$PriorityStats {
  const factory PriorityStats({
    required int high,
    required int medium,
    required int low,
  }) = _PriorityStats;

  factory PriorityStats.fromJson(Map<String, dynamic> json) =>
      _$PriorityStatsFromJson(json);
}
