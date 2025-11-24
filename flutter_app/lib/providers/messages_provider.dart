import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../models/message.dart';
import '../services/message_repository.dart';

part 'messages_provider.g.dart';

/// Messages Provider
/// Task: T031 - Create Riverpod providers
/// Manages messages list and state

@riverpod
class Messages extends _$Messages {
  late final MessageRepository _repository;

  @override
  Future<MessageListResponse> build() async {
    _repository = MessageRepository();
    return await _fetchMessages();
  }

  Future<MessageListResponse> _fetchMessages({
    int page = 1,
    int limit = 50,
    List<Platform>? platforms,
    PriorityLevel? priority,
    bool? readStatus,
    bool? urgent,
    String? categoryId,
  }) async {
    return await _repository.getMessages(
      page: page,
      limit: limit,
      platforms: platforms,
      priority: priority,
      readStatus: readStatus,
      urgent: urgent,
      categoryId: categoryId,
    );
  }

  /// Refresh messages
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _fetchMessages());
  }

  /// Load more messages (pagination)
  Future<void> loadMore() async {
    final currentState = state.valueOrNull;
    if (currentState == null || !currentState.hasMore) return;

    final nextPage = currentState.page + 1;

    state = await AsyncValue.guard(() async {
      final newData = await _fetchMessages(page: nextPage);

      // Merge old and new messages
      return currentState.copyWith(
        messages: [...currentState.messages, ...newData.messages],
        page: newData.page,
        hasMore: newData.hasMore,
      );
    });
  }

  /// Filter messages
  Future<void> filter({
    List<Platform>? platforms,
    PriorityLevel? priority,
    bool? readStatus,
    bool? urgent,
    String? categoryId,
  }) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _fetchMessages(
          platforms: platforms,
          priority: priority,
          readStatus: readStatus,
          urgent: urgent,
          categoryId: categoryId,
        ));
  }

  /// Search messages
  Future<void> search(String query) async {
    if (query.isEmpty) {
      await refresh();
      return;
    }

    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _repository.searchMessages(query));
  }

  /// Mark message as read
  Future<void> markAsRead(String messageId, bool readStatus) async {
    await _repository.updateReadStatus(messageId, readStatus);

    // Update local state
    state.whenData((data) {
      final updatedMessages = data.messages.map((msg) {
        if (msg.id == messageId) {
          return msg.copyWith(readStatus: readStatus);
        }
        return msg;
      }).toList();

      state = AsyncValue.data(data.copyWith(messages: updatedMessages));
    });
  }

  /// Archive message
  Future<void> archive(String messageId) async {
    await _repository.archiveMessage(messageId);

    // Remove from local state
    state.whenData((data) {
      final updatedMessages =
          data.messages.where((msg) => msg.id != messageId).toList();

      state = AsyncValue.data(
        data.copyWith(
          messages: updatedMessages,
          total: data.total - 1,
        ),
      );
    });
  }

  /// Trigger sync
  Future<void> sync() async {
    await _repository.triggerSync();
    await refresh();
  }
}

/// Unread count provider
@riverpod
class UnreadCount extends _$UnreadCount {
  late final MessageRepository _repository;

  @override
  Future<int> build() async {
    _repository = MessageRepository();
    return await _repository.getUnreadCount();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _repository.getUnreadCount());
  }
}

/// Urgent messages provider
@riverpod
class UrgentMessages extends _$UrgentMessages {
  late final MessageRepository _repository;

  @override
  Future<List<Message>> build() async {
    _repository = MessageRepository();
    return await _repository.getUrgentMessages();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _repository.getUrgentMessages());
  }
}

/// Single message provider
@riverpod
class MessageDetail extends _$MessageDetail {
  late final MessageRepository _repository;

  @override
  Future<Message?> build(String messageId) async {
    _repository = MessageRepository();
    try {
      return await _repository.getMessage(messageId);
    } catch (e) {
      return null;
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final messageId = state.valueOrNull?.id;
      if (messageId == null) return null;
      return await _repository.getMessage(messageId);
    });
  }
}

/// Message thread provider
@riverpod
Future<List<Message>> messageThread(
  MessageThreadRef ref,
  String messageId,
) async {
  final repository = MessageRepository();
  return await repository.getThread(messageId);
}

/// Reply suggestions provider
@riverpod
Future<List<String>> replySuggestions(
  ReplySuggestionsRef ref,
  String messageId,
) async {
  final repository = MessageRepository();
  return await repository.getReplies(messageId);
}

/// MessageRepository provider for screens needing direct repository access
@riverpod
MessageRepository messagesRepository(MessagesRepositoryRef ref) {
  return MessageRepository();
}
