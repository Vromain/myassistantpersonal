import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';

class MainScreen extends ConsumerWidget {
  const MainScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Accueil'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) async {
              switch (value) {
                case 'inbox':
                  if (context.mounted) context.push('/inbox');
                  break;
                case 'integrations':
                  if (context.mounted) context.push('/integrations');
                  break;
                case 'settings':
                  if (context.mounted) context.push('/settings');
                  break;
                case 'profile':
                  if (context.mounted) context.push('/profile');
                  break;
                case 'logout':
                  await ref.read(authProvider.notifier).signOut();
                  if (context.mounted) context.go('/login');
                  break;
              }
            },
            itemBuilder: (context) => const [
              PopupMenuItem(
                value: 'inbox',
                child: Row(
                  children: [Icon(Icons.inbox), SizedBox(width: 12), Text('Inbox')],
                ),
              ),
              PopupMenuItem(
                value: 'integrations',
                child: Row(
                  children: [Icon(Icons.extension), SizedBox(width: 12), Text('Integrations')],
                ),
              ),
              PopupMenuItem(
                value: 'settings',
                child: Row(
                  children: [Icon(Icons.settings), SizedBox(width: 12), Text('Paramètres')],
                ),
              ),
              PopupMenuItem(
                value: 'profile',
                child: Row(
                  children: [Icon(Icons.person), SizedBox(width: 12), Text('Profile')],
                ),
              ),
              PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [Icon(Icons.logout), SizedBox(width: 12), Text('Sign out')],
                ),
              ),
            ],
          )
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Bienvenue dans AI Communication Hub',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text(
              'Point d’entrée principal. Accédez à votre Inbox, aux intégrations et à votre profil.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey),
            ),
            const SizedBox(height: 24),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _NavCard(
                  icon: Icons.inbox,
                  title: 'Accéder à l’Inbox',
                  onTap: () => context.push('/inbox'),
                ),
                _NavCard(
                  icon: Icons.extension,
                  title: 'Intégrations',
                  onTap: () => context.push('/integrations'),
                ),
              _NavCard(
                icon: Icons.person,
                title: 'Profil',
                onTap: () => context.push('/profile'),
              ),
              _NavCard(
                icon: Icons.settings,
                title: 'Paramètres',
                onTap: () => context.push('/settings'),
              ),
            ],
          ),
          ],
        ),
      ),
    );
  }
}

class _NavCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _NavCard({
    required this.icon,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 240,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Row(
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            const Icon(Icons.chevron_right),
          ],
        ),
      ),
    );
  }
}
