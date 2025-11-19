import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../models/message.dart';
import '../models/connected_account.dart';
import '../models/auth.dart';

part 'api_client.g.dart';

/// API Client
/// Task: T029 - Create API client and repositories
/// Reference: specs/001-ai-communication-hub/contracts/

@RestApi()
abstract class ApiClient {
  factory ApiClient(Dio dio, {String baseUrl}) = _ApiClient;

  // Authentication endpoints
  @GET('/auth/gmail/status')
  Future<Map<String, dynamic>> getGmailStatus();

  @POST('/auth/gmail/disconnect')
  Future<Map<String, dynamic>> disconnectGmail(
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
  Future<Map<String, dynamic>> getUnreadCount();

  @GET('/messages/urgent')
  Future<Map<String, dynamic>> getUrgentMessages();

  @GET('/messages/{id}')
  Future<Message> getMessage(@Path('id') String id);

  @PATCH('/messages/{id}/read')
  Future<Map<String, dynamic>> updateReadStatus(
    @Path('id') String id,
    @Body() Map<String, bool> body,
  );

  @PATCH('/messages/{id}/archive')
  Future<Map<String, dynamic>> archiveMessage(
    @Path('id') String id,
    @Body() Map<String, bool> body,
  );

  @GET('/messages/{id}/thread')
  Future<Map<String, dynamic>> getThread(@Path('id') String id);

  @GET('/messages/{id}/replies')
  Future<Map<String, dynamic>> getReplies(@Path('id') String id);

  @POST('/messages/{id}/categorize')
  Future<Map<String, dynamic>> categorizeMessage(@Path('id') String id);

  @PATCH('/messages/{id}/category')
  Future<Map<String, dynamic>> assignCategory(
    @Path('id') String id,
    @Body() Map<String, dynamic> body,
  );

  @POST('/messages/search')
  Future<MessageListResponse> searchMessages(
    @Body() Map<String, dynamic> body,
  );

  @POST('/messages/sync')
  Future<Map<String, dynamic>> triggerSync();

  @POST('/messages/bulk/read')
  Future<Map<String, dynamic>> bulkMarkAsRead(
    @Body() Map<String, List<String>> body,
  );

  @POST('/messages/bulk/archive')
  Future<Map<String, dynamic>> bulkArchive(
    @Body() Map<String, List<String>> body,
  );

  @POST('/messages/{id}/reply')
  Future<Map<String, dynamic>> sendReply(
    @Path('id') String id,
    @Body() Map<String, dynamic> body,
  );

  // Categories endpoints
  @GET('/categories')
  Future<Map<String, dynamic>> getCategories();

  @GET('/categories/{id}')
  Future<Map<String, dynamic>> getCategory(@Path('id') String id);

  @POST('/categories')
  Future<Map<String, dynamic>> createCategory(
    @Body() Map<String, dynamic> body,
  );

  @PATCH('/categories/{id}')
  Future<Map<String, dynamic>> updateCategory(
    @Path('id') String id,
    @Body() Map<String, dynamic> body,
  );

  @DELETE('/categories/{id}')
  Future<Map<String, dynamic>> deleteCategory(@Path('id') String id);

  @GET('/categories/stats/usage')
  Future<Map<String, dynamic>> getCategoryStats();

  // Notification endpoints
  @GET('/notifications/preferences')
  Future<Map<String, dynamic>> getNotificationPreferences();

  @PUT('/notifications/preferences')
  Future<Map<String, dynamic>> updateNotificationPreferences(
    @Body() Map<String, dynamic> preferences,
  );

  @POST('/notifications/register')
  Future<Map<String, dynamic>> registerDeviceToken(
    @Body() Map<String, dynamic> body,
  );

  @POST('/notifications/unregister')
  Future<Map<String, dynamic>> unregisterDeviceToken(
    @Body() Map<String, dynamic> body,
  );

  // Analytics endpoints
  @GET('/analytics/summary')
  Future<Map<String, dynamic>> getAnalyticsSummary({
    @Query('startDate') String? startDate,
    @Query('endDate') String? endDate,
  });

  @GET('/analytics/response-times')
  Future<Map<String, dynamic>> getResponseTimes({
    @Query('startDate') String? startDate,
    @Query('endDate') String? endDate,
  });

  @GET('/analytics/platform-breakdown')
  Future<Map<String, dynamic>> getPlatformBreakdown({
    @Query('startDate') String? startDate,
    @Query('endDate') String? endDate,
  });

  @GET('/analytics/top-contacts')
  Future<Map<String, dynamic>> getTopContacts({
    @Query('startDate') String? startDate,
    @Query('endDate') String? endDate,
    @Query('limit') int? limit,
  });
}
