import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_web_plugins/url_strategy.dart';
import 'package:go_router/go_router.dart';

import 'providers/auth_provider.dart';
import 'screens/inbox_screen.dart';
import 'screens/integrations_screen.dart';
import 'screens/login_screen.dart';
import 'screens/message_detail_screen.dart';
import 'screens/profile_screen.dart';
import 'services/auth_service.dart';
import 'utils/env.dart';

/// Main App Entry Point
/// Task: T032 - Create main app and routing
/// Reference: specs/001-ai-communication-hub/plan.md

void main() {
  // Validate environment configuration
  Env.validate();
  if (kIsWeb) {
    setUrlStrategy(const HashUrlStrategy());
  }

  runApp(
    const ProviderScope(
      child: CommunicationHubApp(),
    ),
  );
}

class CommunicationHubApp extends ConsumerWidget {
  const CommunicationHubApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = _createRouter(ref);

    return MaterialApp.router(
      title: Env.appName,
      theme: _buildTheme(),
      darkTheme: _buildDarkTheme(),
      themeMode: ThemeMode.system,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }

  GoRouter _createRouter(WidgetRef ref) {
    return GoRouter(
      initialLocation: '/',
      redirect: (context, state) {
        final authAsync = ref.read(authProvider);
        final isAuthenticated = authAsync.valueOrNull?.isAuthenticated ?? false;
        final isLoading = authAsync.isLoading;
        final isLoginRoute = state.matchedLocation == '/login';
        final hasTokenParam = state.uri.queryParameters.containsKey('token') ||
            Uri.base.queryParameters.containsKey('token');

        if (isLoading) {
          return null;
        }

        // Redirect to login if not authenticated
        if (!isAuthenticated && !isLoginRoute && !hasTokenParam) {
          return '/login';
        }

        // Redirect to inbox if authenticated and on login page
        if (isAuthenticated && isLoginRoute) {
          return '/';
        }

        return null;
      },
      routes: [
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          path: '/',
          builder: (context, state) => RootPage(state: state),
        ),
        GoRoute(
          path: '/integrations',
          builder: (context, state) => const IntegrationsScreen(),
        ),
        GoRoute(
          path: '/profile',
          builder: (context, state) => const ProfileScreen(),
        ),
        GoRoute(
          path: '/message/:id',
          builder: (context, state) {
            final messageId = state.pathParameters['id']!;
            return MessageDetailScreen(messageId: messageId);
          },
        ),
      ],
    );
  }

  ThemeData _buildTheme() {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF4A90E2),
        brightness: Brightness.light,
      ),
      appBarTheme: const AppBarTheme(
        centerTitle: false,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: Colors.grey.shade200,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }

  ThemeData _buildDarkTheme() {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF4A90E2),
        brightness: Brightness.dark,
      ),
      appBarTheme: const AppBarTheme(
        centerTitle: false,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: Colors.grey.shade800,
          ),
        ),
      ),
    );
  }
}

class RootPage extends ConsumerStatefulWidget {
  final GoRouterState state;
  const RootPage({super.key, required this.state});

  @override
  ConsumerState<RootPage> createState() => _RootPageState();
}

class _RootPageState extends ConsumerState<RootPage> {
  bool _handledToken = false;

  @override
  void initState() {
    super.initState();
    _captureTokenIfPresent();
  }

  Future<void> _captureTokenIfPresent() async {
    final token = widget.state.uri.queryParameters['token'] ??
        Uri.base.queryParameters['token'];
    if (token != null && token.isNotEmpty && !_handledToken) {
      _handledToken = true;
      await AuthService.saveTokenFromWebCallback(token);
      ref.invalidate(authProvider);
      if (!mounted) return;
      // Stay on current route; router redirect allows token param
    }
  }

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = ref.watch(isAuthenticatedProvider);
    return isAuthenticated ? const InboxScreen() : const LoginScreen();
  }
}
