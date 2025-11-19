import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/env.dart';

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
      return {'success': false, 'error': data['message'] ?? 'Registration failed'};
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

  // Save auth data
  static Future<void> _saveAuthData(String token, Map<String, dynamic> user) async {
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
