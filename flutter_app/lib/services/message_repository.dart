import '../models/message.dart';
import '../models/message_analysis.dart';
import 'api_client.dart';
import 'database_helper.dart';
import 'dio_client.dart';

/// Message Repository
/// Task: T030 - Implement SQLite caching in message_repository.dart
/// Handles all message-related API calls and local caching with offline support

class MessageRepository {
  late final ApiClient _apiClient;
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;

  MessageRepository() {
    _apiClient = ApiClient(DioClient.instance);
  }

  /// Get messages with filters
  /// Attempts to fetch from API, falls back to cache if offline
  Future<MessageListResponse> getMessages({
    int page = 1,
    int limit = 50,
    List<Platform>? platforms,
    PriorityLevel? priority,
    bool? readStatus,
    bool? urgent,
    String? categoryId,
    String sortBy = 'timestamp',
    String sortOrder = 'desc',
  }) async {
    try {
      // Try to fetch from API
      final response = await _apiClient.getMessages(
        page: page,
        limit: limit,
        platforms: platforms?.map((p) => p.name).join(','),
        priority: priority?.name,
        readStatus: readStatus,
        urgent: urgent,
        categoryId: categoryId,
        sortBy: sortBy,
        sortOrder: sortOrder,
      );

      // Cache the results for offline access
      if (response.messages.isNotEmpty) {
        await _dbHelper.cacheMessages(response.messages);
      }

      return response;
    } catch (e) {
      // If network error, try to return cached messages
      try {
        final cachedMessages = await _dbHelper.getCachedMessages(
          limit: limit,
          offset: (page - 1) * limit,
          platforms: platforms,
          priority: priority,
          readStatus: readStatus,
          urgent: urgent,
          categoryId: categoryId,
          sortBy: sortBy,
          sortOrder: sortOrder,
        );

        // Return cached data with approximate pagination
        return MessageListResponse(
          messages: cachedMessages,
          total: cachedMessages.length,
          page: page,
          limit: limit,
          hasMore: cachedMessages.length >= limit,
          stats: MessageStats.empty(),
        );
      } catch (cacheError) {
        throw _handleError(e);
      }
    }
  }

  /// Get unread messages count
  /// Falls back to cache if offline
  Future<int> getUnreadCount() async {
    try {
      final response = await _apiClient.getUnreadCount();
      return response['count'] as int? ?? 0;
    } catch (e) {
      // If network error, return cached count
      try {
        return await _dbHelper.getCachedUnreadCount();
      } catch (cacheError) {
        throw _handleError(e);
      }
    }
  }

  /// Get urgent messages
  Future<List<Message>> getUrgentMessages() async {
    try {
      final response = await _apiClient.getUrgentMessages();
      final messages = response['messages'] as List?;
      if (messages == null) return [];

      return messages
          .map((json) => Message.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Get single message by ID
  /// Falls back to cache if offline
  Future<Message> getMessage(String id) async {
    try {
      final message = await _apiClient.getMessage(id);
      // Cache the fetched message
      await _dbHelper.cacheMessage(message);
      return message;
    } catch (e) {
      // If network error, try to return cached message
      final cachedMessage = await _dbHelper.getCachedMessage(id);
      if (cachedMessage != null) {
        return cachedMessage;
      }
      throw _handleError(e);
    }
  }

  /// Mark message as read/unread
  /// Updates cache immediately for offline support
  Future<void> updateReadStatus(String id, bool readStatus) async {
    // Update cache immediately for responsive UI
    await _dbHelper.updateCachedReadStatus(id, readStatus);

    try {
      // Sync with server
      await _apiClient.updateReadStatus(id, {'readStatus': readStatus});
    } catch (e) {
      // If sync fails, the change is still cached locally
      // and will be synced when connection is restored
      rethrow;
    }
  }

  /// Archive message
  Future<void> archiveMessage(String id, {bool archive = true}) async {
    try {
      await _apiClient.archiveMessage(id, {'archive': archive});
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Get message thread
  Future<List<Message>> getThread(String id) async {
    try {
      final response = await _apiClient.getThread(id);
      final messages = response['messages'] as List?;
      if (messages == null) return [];

      return messages
          .map((json) => Message.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Get AI reply suggestions
  Future<List<String>> getReplies(String id) async {
    try {
      final response = await _apiClient.getReplies(id);
      final replies = response['replies'] as List?;
      if (replies == null) return [];

      return replies.cast<String>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Categorize message with AI
  Future<String> categorizeMessage(String id) async {
    try {
      final response = await _apiClient.categorizeMessage(id);
      return response['category'] as String? ?? '';
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Manually assign category to message
  /// Updates cache immediately for offline support
  Future<void> assignCategory(String messageId, String? categoryId) async {
    // Update cache immediately for responsive UI
    await _dbHelper.updateCachedCategory(messageId, categoryId);

    try {
      // Sync with server
      await _apiClient.assignCategory(
        messageId,
        {
          if (categoryId != null) 'categoryId': categoryId,
        },
      );
    } catch (e) {
      // If sync fails, the change is still cached locally
      rethrow;
    }
  }

  /// Search messages
  Future<MessageListResponse> searchMessages(
    String query, {
    int page = 1,
    int limit = 50,
  }) async {
    try {
      return await _apiClient.searchMessages({
        'query': query,
        'page': page,
        'limit': limit,
      });
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Trigger manual sync
  Future<void> triggerSync() async {
    try {
      await _apiClient.triggerSync();
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Bulk mark as read
  Future<int> bulkMarkAsRead(List<String> messageIds) async {
    try {
      final response = await _apiClient.bulkMarkAsRead({
        'messageIds': messageIds,
      });
      return response['count'] as int? ?? 0;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Bulk archive
  Future<int> bulkArchive(List<String> messageIds) async {
    try {
      final response = await _apiClient.bulkArchive({
        'messageIds': messageIds,
      });
      return response['count'] as int? ?? 0;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Send reply to a message
  Future<String> sendReply({
    required String messageId,
    required String content,
    bool replyAll = false,
  }) async {
    try {
      final response = await _apiClient.sendReply(
        messageId,
        {
          'content': content,
          'replyAll': replyAll,
        },
      );
      return response['sentMessageId'] as String? ?? '';
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Trigger AI analysis for a message
  /// Task: T031 - Implement analyzeMessage method
  Future<MessageAnalysis> analyzeMessage(String messageId) async {
    try {
      final response = await _apiClient.analyzeMessage(
        messageId,
        {},
      );
      return MessageAnalysis.fromJson(response['analysis'] as Map<String, dynamic>);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Get existing analysis for a message
  /// Task: T032 - Implement getMessageAnalysis method
  Future<MessageAnalysis?> getMessageAnalysis(String messageId) async {
    try {
      final response = await _apiClient.getMessageAnalysisRaw(messageId);
      return MessageAnalysis.fromJson(response as Map<String, dynamic>);
    } catch (e) {
      // Return null if analysis doesn't exist (404)
      if (e.toString().contains('404') || e.toString().contains('Not Found')) {
        return null;
      }
      throw _handleError(e);
    }
  }

  /// Clear all cached messages
  Future<void> clearCache() async {
    await _dbHelper.clearCache();
  }

  /// Clear old cached messages (older than specified days)
  Future<void> clearOldCache({int daysToKeep = 30}) async {
    await _dbHelper.clearOldCache(daysToKeep: daysToKeep);
  }

  /// Handle API errors
  Exception _handleError(dynamic error) {
    if (error is Exception) {
      return error;
    }
    return Exception('An unexpected error occurred: $error');
  }
}
