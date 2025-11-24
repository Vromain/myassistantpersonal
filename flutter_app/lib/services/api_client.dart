import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';

import '../models/message.dart';

part 'api_client.g.dart';

/// API Client
/// Task: T029 - Create API client and repositories
/// Reference: specs/001-ai-communication-hub/contracts/

@RestApi()
abstract class ApiClient {
  factory ApiClient(Dio dio, {String baseUrl}) = _ApiClient;

  // Authentication endpoints
  @GET('/auth/gmail/status')
  Future<dynamic> getGmailStatus();

  @POST('/auth/gmail/disconnect')
  Future<dynamic> disconnectGmail(
    @Body() Map<String, String> body,
  );

  // Messages endpoints
  @GET('/messages')
  Future<MessageListResponse> getMessages({
    @Query('page') int? page,
    @Query('limit') int? limit,
    @Query('platforms') String? platforms,
    @Query('priority') String? priority,
    @Query('readStatus') bool? readStatus,
    @Query('urgent') bool? urgent,
    @Query('categoryId') String? categoryId,
    @Query('sortBy') String? sortBy,
    @Query('sortOrder') String? sortOrder,
  });

  @GET('/messages/unread/count')
  Future<dynamic> getUnreadCount();

  @GET('/messages/urgent')
  Future<dynamic> getUrgentMessages();

  @GET('/messages/{id}')
  Future<Message> getMessage(@Path('id') String id);

  @PATCH('/messages/{id}/read')
  Future<dynamic> updateReadStatus(
    @Path('id') String id,
    @Body() Map<String, bool> body,
  );

  @PATCH('/messages/{id}/archive')
  Future<dynamic> archiveMessage(
    @Path('id') String id,
    @Body() Map<String, bool> body,
  );

  @GET('/messages/{id}/thread')
  Future<dynamic> getThread(@Path('id') String id);

  @GET('/messages/{id}/replies')
  Future<dynamic> getReplies(@Path('id') String id);

  @POST('/messages/{id}/categorize')
  Future<dynamic> categorizeMessage(@Path('id') String id);

  @PATCH('/messages/{id}/category')
  Future<dynamic> assignCategory(
    @Path('id') String id,
    @Body() Map<String, dynamic> body,
  );

  @POST('/messages/search')
  Future<MessageListResponse> searchMessages(
    @Body() Map<String, dynamic> body,
  );

  @POST('/messages/sync')
  Future<dynamic> triggerSync();

  @POST('/messages/bulk/read')
  Future<dynamic> bulkMarkAsRead(
    @Body() Map<String, List<String>> body,
  );

  @POST('/messages/bulk/archive')
  Future<dynamic> bulkArchive(
    @Body() Map<String, List<String>> body,
  );

  @POST('/messages/{id}/reply')
  Future<dynamic> sendReply(
    @Path('id') String id,
    @Body() Map<String, dynamic> body,
  );

  @POST('/messages/{id}/analyze')
  Future<dynamic> analyzeMessage(
    @Path('id') String id,
    @Body() Map<String, dynamic> body,
  );

  @GET('/messages/{id}/analysis')
  Future<dynamic> getMessageAnalysisRaw(
    @Path('id') String id,
  );

  // Categories endpoints
  @GET('/categories')
  Future<dynamic> getCategories();

  @GET('/categories/{id}')
  Future<dynamic> getCategory(@Path('id') String id);

  @POST('/categories')
  Future<dynamic> createCategory(
    @Body() Map<String, dynamic> body,
  );

  @PATCH('/categories/{id}')
  Future<dynamic> updateCategory(
    @Path('id') String id,
    @Body() Map<String, dynamic> body,
  );

  @DELETE('/categories/{id}')
  Future<dynamic> deleteCategory(@Path('id') String id);

  @GET('/categories/stats/usage')
  Future<dynamic> getCategoryStats();

  // Notification endpoints
  @GET('/notifications/preferences')
  Future<dynamic> getNotificationPreferences();

  @PUT('/notifications/preferences')
  Future<dynamic> updateNotificationPreferences(
    @Body() Map<String, dynamic> preferences,
  );

  @POST('/notifications/register')
  Future<dynamic> registerDeviceToken(
    @Body() Map<String, dynamic> body,
  );

  @POST('/notifications/unregister')
  Future<dynamic> unregisterDeviceToken(
    @Body() Map<String, dynamic> body,
  );

  // Analytics endpoints
  @GET('/analytics/summary')
  Future<dynamic> getAnalyticsSummary({
    @Query('startDate') String? startDate,
    @Query('endDate') String? endDate,
  });

  @GET('/analytics/response-times')
  Future<dynamic> getResponseTimes({
    @Query('startDate') String? startDate,
    @Query('endDate') String? endDate,
  });

  @GET('/analytics/platform-breakdown')
  Future<dynamic> getPlatformBreakdown({
    @Query('startDate') String? startDate,
    @Query('endDate') String? endDate,
  });

  @GET('/analytics/top-contacts')
  Future<dynamic> getTopContacts({
    @Query('startDate') String? startDate,
    @Query('endDate') String? endDate,
    @Query('limit') int? limit,
  });
}
