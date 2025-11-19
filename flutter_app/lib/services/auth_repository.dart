import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import '../models/auth.dart';
import '../models/user.dart';
import '../utils/env.dart';
import 'dio_client.dart';

/// Authentication Repository
/// Task: T030 - Create auth repository
/// Handles OAuth flows and authentication state

class AuthRepository {
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: [
      'email',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send',
    ],
  );

  /// Sign in with Google OAuth
  Future<AuthState> signInWithGoogle() async {
    try {
      // For web/mobile - use web auth flow
      if (Env.googleClientId.isEmpty) {
        throw Exception('Google Client ID not configured');
      }

      // Build OAuth URL
      final authUrl = Uri.parse('${Env.apiBaseUrl}/auth/gmail');

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

      // TODO: Fetch user profile
      // For now, return authenticated state with minimal user
      final user = User(
        id: 'temp-id',
        email: 'user@example.com',
        preferences: UserPreferences.defaults(),
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      return AuthState.authenticated(
        user: user,
        accessToken: token,
      );
    } catch (e) {
      print('❌ Sign in error: $e');
      return AuthState(error: e.toString());
    }
  }

  /// Sign in with Google (native - for mobile)
  Future<AuthState> signInWithGoogleNative() async {
    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

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

      // Create user from Google account
      final user = User(
        id: googleUser.id,
        email: googleUser.email,
        preferences: UserPreferences.defaults(),
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      return AuthState.authenticated(
        user: user,
        accessToken: token,
      );
    } catch (e) {
      print('❌ Native sign in error: $e');
      return AuthState(error: e.toString());
    }
  }

  /// Sign out
  Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
      await DioClient.clearTokens();
      DioClient.reset();
    } catch (e) {
      print('❌ Sign out error: $e');
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

      // TODO: Fetch user profile from API
      // For now, return minimal authenticated state
      final user = User(
        id: 'restored-user',
        email: 'user@example.com',
        preferences: UserPreferences.defaults(),
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      return AuthState.authenticated(
        user: user,
        accessToken: token,
      );
    } catch (e) {
      print('❌ Restore auth error: $e');
      return null;
    }
  }
}
