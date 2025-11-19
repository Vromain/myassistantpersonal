import 'dart:convert';
import 'package:http/http.dart' as http;
import '../utils/env.dart';
import 'auth_service.dart';

class AccountsService {
  // Connect IMAP account
  static Future<Map<String, dynamic>> connectImap({
    required String email,
    required String password,
    required String host,
    required int port,
    bool secure = true,
  }) async {
    try {
      final headers = await AuthService.getAuthHeaders();

      final response = await http.post(
        Uri.parse('${Env.apiBaseUrl}/accounts/imap'),
        headers: headers,
        body: jsonEncode({
          'email': email,
          'password': password,
          'host': host,
          'port': port,
          'secure': secure,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'account': data['account'],
          'message': data['message']
        };
      } else {
        return {
          'success': false,
          'error': data['message'] ?? 'Failed to connect IMAP account'
        };
      }
    } catch (e) {
      return {
        'success': false,
        'error': 'Connection error: $e'
      };
    }
  }

  // Get all connected accounts
  static Future<Map<String, dynamic>> getAccounts() async {
    try {
      final headers = await AuthService.getAuthHeaders();

      final response = await http.get(
        Uri.parse('${Env.apiBaseUrl}/accounts'),
        headers: headers,
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'accounts': data['accounts'],
          'total': data['total']
        };
      } else {
        return {
          'success': false,
          'error': data['message'] ?? 'Failed to fetch accounts'
        };
      }
    } catch (e) {
      return {
        'success': false,
        'error': 'Connection error: $e'
      };
    }
  }

  // Disconnect account
  static Future<Map<String, dynamic>> disconnectAccount(String accountId) async {
    try {
      final headers = await AuthService.getAuthHeaders();

      final response = await http.delete(
        Uri.parse('${Env.apiBaseUrl}/accounts/$accountId'),
        headers: headers,
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message']
        };
      } else {
        return {
          'success': false,
          'error': data['message'] ?? 'Failed to disconnect account'
        };
      }
    } catch (e) {
      return {
        'success': false,
        'error': 'Connection error: $e'
      };
    }
  }

  // Test account connection
  static Future<Map<String, dynamic>> testConnection(String accountId) async {
    try {
      final headers = await AuthService.getAuthHeaders();

      final response = await http.post(
        Uri.parse('${Env.apiBaseUrl}/accounts/$accountId/test'),
        headers: headers,
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'message': data['message'] ?? 'Connection test successful'
        };
      } else {
        return {
          'success': false,
          'error': data['message'] ?? 'Connection test failed'
        };
      }
    } catch (e) {
      return {
        'success': false,
        'error': 'Connection error: $e'
      };
    }
  }

  // Update IMAP account
  static Future<Map<String, dynamic>> updateImapAccount({
    required String accountId,
    required String email,
    required String password,
    required String host,
    required int port,
    bool secure = true,
  }) async {
    try {
      final headers = await AuthService.getAuthHeaders();

      final response = await http.put(
        Uri.parse('${Env.apiBaseUrl}/accounts/$accountId'),
        headers: headers,
        body: jsonEncode({
          'email': email,
          'password': password,
          'host': host,
          'port': port,
          'secure': secure,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return {
          'success': true,
          'account': data['account'],
          'message': data['message'] ?? 'Account updated successfully'
        };
      } else {
        return {
          'success': false,
          'error': data['message'] ?? 'Failed to update account'
        };
      }
    } catch (e) {
      return {
        'success': false,
        'error': 'Connection error: $e'
      };
    }
  }
}
