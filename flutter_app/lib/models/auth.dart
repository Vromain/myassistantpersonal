import 'package:freezed_annotation/freezed_annotation.dart';
import 'user.dart';

part 'auth.freezed.dart';
part 'auth.g.dart';

/// Authentication Models
/// Task: T028 - Create Dart models

@freezed
class AuthState with _$AuthState {
  const factory AuthState({
    User? user,
    String? accessToken,
    String? refreshToken,
    DateTime? tokenExpiry,
    @Default(false) bool isAuthenticated,
    @Default(false) bool isLoading,
    String? error,
  }) = _AuthState;

  factory AuthState.fromJson(Map<String, dynamic> json) =>
      _$AuthStateFromJson(json);

  factory AuthState.unauthenticated() => const AuthState();

  factory AuthState.authenticated({
    required User user,
    required String accessToken,
    String? refreshToken,
    DateTime? tokenExpiry,
  }) =>
      AuthState(
        user: user,
        accessToken: accessToken,
        refreshToken: refreshToken,
        tokenExpiry: tokenExpiry,
        isAuthenticated: true,
      );
}

@freezed
class LoginResponse with _$LoginResponse {
  const factory LoginResponse({
    required User user,
    required String token,
    String? refreshToken,
  }) = _LoginResponse;

  factory LoginResponse.fromJson(Map<String, dynamic> json) =>
      _$LoginResponseFromJson(json);
}
