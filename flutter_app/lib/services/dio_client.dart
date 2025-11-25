import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/env.dart';

/// Dio Client Factory
/// Task: T029 - Create API client configuration
/// Configures Dio with interceptors for auth, logging, and error handling

class DioClient {
  static Dio? _dio;
  static const _storage = FlutterSecureStorage();

  static Dio get instance {
    if (_dio != null) return _dio!;

    _dio = Dio(
      BaseOptions(
        baseUrl: Env.apiBaseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Add interceptors
    _dio!.interceptors.add(_authInterceptor());
    _dio!.interceptors.add(_loggingInterceptor());
    _dio!.interceptors.add(_errorInterceptor());

    return _dio!;
  }

  /// Auth interceptor - adds JWT token to requests
  static Interceptor _authInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Get token from secure storage
        String? token = await _storage.read(key: 'access_token');
        if (token == null || token.isEmpty) {
          final prefs = await SharedPreferences.getInstance();
          token = prefs.getString('auth_token');
        }

        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }

        return handler.next(options);
      },
      onError: (error, handler) async {
        // Handle token expiration
        if (error.response?.statusCode == 401) {
          // Try to refresh token
          final refreshToken = await _storage.read(key: 'refresh_token');

          if (refreshToken != null) {
            try {
              // TODO: Implement token refresh logic
              // For now, just pass the error through
              return handler.next(error);
            } catch (e) {
              // Refresh failed, clear tokens and pass error
              await _storage.delete(key: 'access_token');
              await _storage.delete(key: 'refresh_token');
              return handler.next(error);
            }
          }
        }

        return handler.next(error);
      },
    );
  }

  /// Logging interceptor - logs requests and responses
  static Interceptor _loggingInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) {
        if (Env.enableDebugLogging) {
          debugPrint('🌐 REQUEST[${options.method}] => ${options.uri}');
          debugPrint('Headers: ${options.headers}');
          if (options.data != null) {
            debugPrint('Data: ${options.data}');
          }
        }
        return handler.next(options);
      },
      onResponse: (response, handler) {
        if (Env.enableDebugLogging) {
          debugPrint('✅ RESPONSE[${response.statusCode}] => ${response.requestOptions.uri}');
          debugPrint('Data: ${response.data}');
        }
        return handler.next(response);
      },
      onError: (error, handler) {
        if (Env.enableDebugLogging) {
          debugPrint('❌ ERROR[${error.response?.statusCode}] => ${error.requestOptions.uri}');
          debugPrint('Message: ${error.message}');
          if (error.response?.data != null) {
            debugPrint('Data: ${error.response?.data}');
          }
        }
        return handler.next(error);
      },
    );
  }

  /// Error interceptor - handles common errors
  static Interceptor _errorInterceptor() {
    return InterceptorsWrapper(
      onError: (error, handler) {
        String message = 'An error occurred';

        if (error.type == DioExceptionType.connectionTimeout ||
            error.type == DioExceptionType.receiveTimeout) {
          message = 'Connection timeout. Please check your internet connection.';
        } else if (error.type == DioExceptionType.badResponse) {
          final statusCode = error.response?.statusCode;
          switch (statusCode) {
            case 400:
              message = 'Bad request';
              break;
            case 401:
              message = 'Unauthorized. Please log in again.';
              break;
            case 403:
              message = 'Forbidden. You don\'t have permission.';
              break;
            case 404:
              message = 'Resource not found';
              break;
            case 500:
              message = 'Server error. Please try again later.';
              break;
            default:
              message = 'Error: ${error.response?.statusMessage ?? 'Unknown error'}';
          }

          // Try to extract error message from response
          if (error.response?.data is Map) {
            final data = error.response?.data as Map;
            if (data.containsKey('message')) {
              message = data['message'];
            } else if (data.containsKey('error')) {
              final errorData = data['error'];
              if (errorData is String) {
                message = errorData;
              } else if (errorData is Map && errorData.containsKey('message')) {
                message = errorData['message'];
              }
            }
          }
        } else if (error.type == DioExceptionType.unknown) {
          message = 'No internet connection';
        }

        // Create a new error with user-friendly message
        return handler.next(
          DioException(
            requestOptions: error.requestOptions,
            response: error.response,
            type: error.type,
            error: message,
            message: message,
          ),
        );
      },
    );
  }

  /// Save authentication token
  static Future<void> saveToken(String token, {String? refreshToken}) async {
    await _storage.write(key: 'access_token', value: token);
    if (refreshToken != null) {
      await _storage.write(key: 'refresh_token', value: refreshToken);
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  /// Get saved token
  static Future<String?> getToken() async {
    final token = await _storage.read(key: 'access_token');
    if (token != null && token.isNotEmpty) return token;
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  /// Clear tokens
  static Future<void> clearTokens() async {
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
  }

  /// Reset client (for logout)
  static void reset() {
    _dio?.close();
    _dio = null;
  }
}
