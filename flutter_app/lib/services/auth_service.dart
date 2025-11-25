import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../utils/env.dart';
import 'dio_client.dart';

class AuthService {
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'user_data';

  // Register new user
  static Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String displayName,
  }) async {
    final response = await http.post(
      Uri.parse('${Env.apiBaseUrl}/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
        'displayName': displayName,
      }),
    );

    final data = jsonDecode(response.body);

    if (response.statusCode == 201) {
      // Save token and user data
      await _saveAuthData(data['token'], data['user']);
      return {'success': true, 'user': data['user']};
    } else {
      return {
        'success': false,
        'error': data['message'] ?? 'Registration failed'
      };
    }
  }

  // Login existing user
  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('${Env.apiBaseUrl}/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );

    final data = jsonDecode(response.body);

    if (response.statusCode == 200) {
      // Save token and user data
      await _saveAuthData(data['token'], data['user']);
      return {'success': true, 'user': data['user']};
    } else {
      return {'success': false, 'error': data['message'] ?? 'Login failed'};
    }
  }

  // Logout user
  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
    await DioClient.clearTokens();
    DioClient.reset();
  }

  // Get stored token
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  // Get stored user data
  static Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString(_userKey);
    if (userJson != null) {
      return jsonDecode(userJson);
    }
    return null;
  }

  // Check if user is logged in
  static Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null;
  }

  // Login with Google OAuth (cross-platform)
  static Future<Map<String, dynamic>> loginWithGoogle() async {
    try {
      if (kIsWeb) {
        final url = Uri.parse('${Env.apiBaseUrl}/auth/gmail?state=web');
        await launchUrl(url, webOnlyWindowName: '_self');
        return {'success': true};
      }

      final authUrl =
          Uri.parse('${Env.apiBaseUrl}/auth/gmail?callback=commhub');
      final result = await FlutterWebAuth2.authenticate(
          url: authUrl.toString(), callbackUrlScheme: 'commhub');
      final uri = Uri.parse(result);
      final token = uri.queryParameters['token'];

      if (token == null || token.isEmpty) {
        return {
          'success': false,
          'error': 'Authentication failed: no token returned'
        };
      }

      // Save token in SharedPreferences for existing services
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tokenKey, token);
      // Save token in secure storage for Dio-based clients
      await DioClient.saveToken(token);

      // Optionally fetch user profile from backend
      try {
        final response = await http.get(
          Uri.parse('${Env.apiBaseUrl}/users/me'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
        );

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          await prefs.setString(_userKey, jsonEncode(data));
        }
      } catch (_) {}

      return {
        'success': true,
        'token': token,
      };
    } catch (e) {
      return {'success': false, 'error': 'Google authentication error: $e'};
    }
  }

  // Save token captured from web redirect
  static Future<void> saveTokenFromWebCallback(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await DioClient.saveToken(token);
  }

  // Save auth data
  static Future<void> _saveAuthData(
      String token, Map<String, dynamic> user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_userKey, jsonEncode(user));
  }

  // Get authorization header
  static Future<Map<String, String>> getAuthHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }
}
