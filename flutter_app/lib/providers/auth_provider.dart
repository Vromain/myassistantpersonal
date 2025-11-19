import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../models/auth.dart';
import '../services/auth_repository.dart';

part 'auth_provider.g.dart';

/// Authentication Provider
/// Task: T031 - Create Riverpod providers
/// Manages authentication state

@riverpod
class Auth extends _$Auth {
  late final AuthRepository _authRepository;

  @override
  Future<AuthState> build() async {
    _authRepository = AuthRepository();

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
