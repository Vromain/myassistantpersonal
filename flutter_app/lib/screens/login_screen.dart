import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/auth_provider.dart';
import '../utils/env.dart';

/// Login Screen
/// Task: T033 - Create login screen
/// Reference: specs/001-ai-communication-hub/plan.md

class LoginScreen extends ConsumerWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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

                // Features list
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
                const SizedBox(height: 48),

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
            color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
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
      icon: Image.network(
        'https://www.google.com/favicon.ico',
        width: 20,
        height: 20,
        errorBuilder: (context, error, stackTrace) {
          return const Icon(Icons.login, size: 20);
        },
      ),
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
