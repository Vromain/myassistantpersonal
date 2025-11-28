import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../services/auth_service.dart';
import '../utils/env.dart';

/// Login Screen
/// Task: T033 - Create login screen
/// Reference: specs/001-ai-communication-hub/plan.md

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  bool _handledToken = false;
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    debugPrint('LoginScreen loaded');
    _captureTokenIfPresent();
  }

  Future<void> _captureTokenIfPresent() async {
    final token = Uri.base.queryParameters['token'];
    if (token != null && token.isNotEmpty && !_handledToken) {
      _handledToken = true;
      await AuthService.saveTokenFromWebCallback(token);
      ref.invalidate(authProvider);
      if (!mounted) return;
      // Stay on login route; router will render Inbox once authenticated
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Logo/Icon
                Icon(
                  Icons.mail_outline,
                  size: 80,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 24),

                // Title
                Text(
                  Env.appName,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),

                // Subtitle
                Text(
                  'AI-Powered Unified Inbox',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Colors.grey,
                      ),
                ),
                const SizedBox(height: 48),

                const SizedBox(height: 24),

                Text(
                  'Connexion locale',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: 16),
                // Email/Password form
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextField(
                      controller: _emailController,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.email],
                      decoration: const InputDecoration(
                        labelText: 'Email',
                        hintText: 'you@example.com',
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _passwordController,
                      obscureText: true,
                      textInputAction: TextInputAction.done,
                      autofillHints: const [AutofillHints.password],
                      decoration: const InputDecoration(
                        labelText: 'Password',
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (_error != null)
                      Text(
                        _error!,
                        style: TextStyle(color: Colors.red.shade700),
                        textAlign: TextAlign.center,
                      ),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      onPressed: _submitting
                          ? null
                          : () async {
                              final email = _emailController.text.trim();
                              final password = _passwordController.text;
                              if (email.isEmpty || password.isEmpty) {
                                setState(() =>
                                    _error = 'Email et mot de passe requis');
                                return;
                              }
                              setState(() {
                                _submitting = true;
                                _error = null;
                              });
                              final router = GoRouter.of(context);
                              await ref
                                  .read(authProvider.notifier)
                                  .signInWithEmailPassword(email, password);
                              if (!mounted) return;
                              final isAuth = ref.read(isAuthenticatedProvider);
                              if (isAuth) {
                                router.go('/main');
                              } else {
                                final err =
                                    ref.read(authProvider).valueOrNull?.error;
                                setState(() {
                                  _error = err ?? 'Échec de connexion';
                                  _submitting = false;
                                });
                              }
                            },
                      child: _submitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Se connecter'),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Google Sign In button
                authState.when(
                  data: (state) {
                    if (state.error != null) {
                      return Column(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.error_outline,
                                    color: Colors.red.shade700),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    state.error!,
                                    style: TextStyle(
                                      color: Colors.red.shade700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          _buildGoogleSignInButton(context, ref),
                        ],
                      );
                    }
                    return _buildGoogleSignInButton(context, ref);
                  },
                  loading: () => const Center(
                    child: CircularProgressIndicator(),
                  ),
                  error: (error, stack) => Column(
                    children: [
                      Text(
                        'Error: $error',
                        style: TextStyle(color: Colors.red.shade700),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      _buildGoogleSignInButton(context, ref),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Privacy notice
                Text(
                  'By signing in, you agree to our Terms of Service and Privacy Policy',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey,
                      ),
                ),

                const SizedBox(height: 24),
                _buildFeatureItem(
                  context,
                  icon: Icons.inbox,
                  title: 'Unified Inbox',
                  description: 'All your messages in one place',
                ),
                const SizedBox(height: 16),
                _buildFeatureItem(
                  context,
                  icon: Icons.auto_awesome,
                  title: 'AI Priority Scoring',
                  description: 'Never miss important messages',
                ),
                const SizedBox(height: 16),
                _buildFeatureItem(
                  context,
                  icon: Icons.reply,
                  title: 'Smart Replies',
                  description: 'AI-powered response suggestions',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            color: Theme.of(context).colorScheme.primary,
            size: 24,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              Text(
                description,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey,
                    ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildGoogleSignInButton(BuildContext context, WidgetRef ref) {
    return ElevatedButton.icon(
      onPressed: () async {
        await ref.read(authProvider.notifier).signInWithGoogle();
      },
      icon: const Icon(Icons.email, size: 20),
      label: const Text('Continue with Gmail'),
      style: ElevatedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 2,
        shadowColor: Colors.black26,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: Colors.grey.shade300),
        ),
      ),
    );
  }
}
