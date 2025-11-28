import 'package:flutter/foundation.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/auth.dart';
import '../models/user.dart';
import '../utils/env.dart';
import 'dio_client.dart';

/// Authentication Repository
/// Task: T030 - Create auth repository
/// Handles OAuth flows and authentication state

class AuthRepository {
  GoogleSignIn? _googleSignIn;

  /// Sign in with Google OAuth
  Future<AuthState> signInWithGoogle() async {
    try {
      if (kIsWeb) {
        final url = Uri.parse('${Env.apiBaseUrl}/auth/gmail?state=web');
        await launchUrl(url, webOnlyWindowName: '_self');
        return const AuthState(error: null);
      }

      if (Env.googleClientId.isEmpty) {
        throw Exception('Google Client ID not configured');
      }

      // Build OAuth URL
      final authUrl =
          Uri.parse('${Env.apiBaseUrl}/auth/gmail?callback=commhub');

      // Start OAuth flow
      final result = await FlutterWebAuth2.authenticate(
        url: authUrl.toString(),
        callbackUrlScheme: 'commhub',
      );

      // Extract token from callback URL
      final uri = Uri.parse(result);
      final token = uri.queryParameters['token'];

      if (token == null || token.isEmpty) {
        throw Exception('No token received from OAuth');
      }

      // Save token
      await DioClient.saveToken(token);
      final user = await _fetchUserProfile();

      return AuthState.authenticated(
        user: user,
        accessToken: token,
      );
    } catch (e) {
      debugPrint('❌ Sign in error: $e');
      return AuthState(error: e.toString());
    }
  }

  /// Sign in with Google (native - for mobile)
  Future<AuthState> signInWithGoogleNative() async {
    try {
      if (kIsWeb) {
        return const AuthState(
            error: 'Native Google sign-in not supported on web');
      }
      _googleSignIn ??= GoogleSignIn(
        scopes: [
          'email',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/gmail.send',
        ],
      );
      final GoogleSignInAccount? googleUser = await _googleSignIn!.signIn();

      if (googleUser == null) {
        // User cancelled
        return const AuthState(error: 'Sign in cancelled');
      }

      final GoogleSignInAuthentication googleAuth =
          await googleUser.authentication;

      final token = googleAuth.accessToken;
      if (token == null) {
        throw Exception('No access token received');
      }

      // Save token
      await DioClient.saveToken(token);
      // Try to fetch user profile from backend; fallback to Google account info
      User user;
      try {
        user = await _fetchUserProfile();
      } catch (_) {
        user = User(
          id: googleUser.id,
          email: googleUser.email,
          preferences: UserPreferences.defaults(),
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );
      }

      return AuthState.authenticated(
        user: user,
        accessToken: token,
      );
    } catch (e) {
      debugPrint('❌ Native sign in error: $e');
      return AuthState(error: e.toString());
    }
  }

  /// Sign out
  Future<void> signOut() async {
    try {
      await _googleSignIn?.signOut();
      await DioClient.clearTokens();
      DioClient.reset();
    } catch (e) {
      debugPrint('❌ Sign out error: $e');
      rethrow;
    }
  }

  /// Check if user is signed in
  Future<bool> isSignedIn() async {
    final token = await DioClient.getToken();
    return token != null && token.isNotEmpty;
  }

  /// Restore authentication state
  Future<AuthState?> restoreAuth() async {
    try {
      final token = await DioClient.getToken();
      if (token == null || token.isEmpty) {
        return null;
      }

      final user = await _fetchUserProfile();

      return AuthState.authenticated(
        user: user,
        accessToken: token,
      );
    } catch (e) {
      debugPrint('❌ Restore auth error: $e');
      return null;
    }
  }

  /// Public wrapper to fetch current user profile
  Future<User> fetchUserProfile() => _fetchUserProfile();

  /// Fetch current user profile from backend
  Future<User> _fetchUserProfile() async {
    try {
      final response = await DioClient.instance.get('/users/me');
      final data = response.data;

      if (data is Map<String, dynamic>) {
        try {
          return User.fromJson(data);
        } catch (_) {
          // Fallback if preferences or optional fields are missing
          return User(
            id: (data['id'] ?? data['_id'] ?? '').toString(),
            email: (data['email'] ?? '').toString(),
            subscriptionTier: (data['subscriptionTier'] ?? 'free').toString(),
            preferences: data['preferences'] is Map<String, dynamic>
                ? UserPreferences.fromJson(
                    data['preferences'] as Map<String, dynamic>)
                : UserPreferences.defaults(),
            connectedAccountIds: (data['connectedAccountIds'] as List?)
                    ?.map((e) => e.toString())
                    .toList() ??
                const [],
            lastLoginAt: data['lastLoginAt'] != null
                ? DateTime.tryParse(data['lastLoginAt'].toString())
                : null,
            createdAt: data['createdAt'] != null
                ? DateTime.tryParse(data['createdAt'].toString()) ??
                    DateTime.now()
                : DateTime.now(),
            updatedAt: data['updatedAt'] != null
                ? DateTime.tryParse(data['updatedAt'].toString()) ??
                    DateTime.now()
                : DateTime.now(),
          );
        }
      }

      throw Exception('Invalid user profile response');
    } catch (e) {
      debugPrint('❌ Fetch user profile error: $e');
      rethrow;
    }
  }
}
