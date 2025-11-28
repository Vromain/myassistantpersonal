import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../models/auth.dart';
import '../models/user.dart';
import '../services/auth_repository.dart';
import '../services/auth_service.dart';
import '../services/dio_client.dart';

part 'auth_provider.g.dart';

/// Authentication Provider
/// Task: T031 - Create Riverpod providers
/// Manages authentication state

@riverpod
class Auth extends _$Auth {
  final AuthRepository _authRepository = AuthRepository();

  @override
  Future<AuthState> build() async {
    // Try to restore previous session
    final authState = await _authRepository.restoreAuth();
    return authState ?? AuthState.unauthenticated();
  }

  /// Sign in with Google
  Future<void> signInWithGoogle() async {
    state = const AsyncValue.loading();

    state = await AsyncValue.guard(() async {
      return await _authRepository.signInWithGoogle();
    });
  }

  /// Sign in with Google (native)
  Future<void> signInWithGoogleNative() async {
    state = const AsyncValue.loading();

    state = await AsyncValue.guard(() async {
      return await _authRepository.signInWithGoogleNative();
    });
  }

  /// Sign out
  Future<void> signOut() async {
    await _authRepository.signOut();
    state = AsyncValue.data(AuthState.unauthenticated());
  }

  /// Sign in with email/password
  Future<void> signInWithEmailPassword(String email, String password) async {
    state = const AsyncValue.loading();

    state = await AsyncValue.guard(() async {
      final result = await AuthService.login(email: email, password: password);
      if (result['success'] != true) {
        throw Exception(result['error'] ?? 'Login failed');
      }
      // Token has been saved by AuthService
      final token = await DioClient.getToken() ?? '';

      // Build a minimal user from login response to avoid blocking on profile fetch
      final userJson = result['user'] as Map<String, dynamic>;
      User user = User(
        id: (userJson['id'] ?? userJson['_id'] ?? '').toString(),
        email: (userJson['email'] ?? '').toString(),
        subscriptionTier: (userJson['subscriptionTier'] ?? 'free').toString(),
        preferences: UserPreferences.defaults(),
        connectedAccountIds: const [],
        lastLoginAt: DateTime.now(),
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      // Try to fetch the full profile; fallback to minimal if it fails (e.g., CORS on web)
      try {
        user = await _authRepository.fetchUserProfile();
      } catch (_) {}

      return AuthState.authenticated(user: user, accessToken: token);
    });
  }
}

/// Helper provider to check if user is authenticated
@riverpod
bool isAuthenticated(IsAuthenticatedRef ref) {
  final authState = ref.watch(authProvider);
  return authState.valueOrNull?.isAuthenticated ?? false;
}

/// Helper provider to get current user
@riverpod
String? currentUserId(CurrentUserIdRef ref) {
  final authState = ref.watch(authProvider);
  return authState.valueOrNull?.user?.id;
}
