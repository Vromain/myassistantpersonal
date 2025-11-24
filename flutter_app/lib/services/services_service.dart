import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/service_health.dart';
import '../utils/env.dart';
import 'auth_service.dart';

/// Services Service
/// Task: T014 - Create ServicesService API client
/// Feature: 002-intelligent-message-analysis

class ServicesService {
  /// Get health status of all services
  static Future<ServicesHealthResponse?> getServicesHealth() async {
    try {
      final headers = await AuthService.getAuthHeaders();

      final response = await http.get(
        Uri.parse('${Env.apiBaseUrl}/services/health'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return ServicesHealthResponse.fromJson(data);
      } else {
        print('Error fetching services health: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      print('Exception fetching services health: $e');
      return null;
    }
  }
}
