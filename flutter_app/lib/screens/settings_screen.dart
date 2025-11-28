import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/settings_provider.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool? _autoDeleteSpam;
  bool? _autoSendReplies;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final async = ref.read(userSettingsStateProvider);
      final data = async.valueOrNull;
      if (data != null) {
        setState(() {
          _autoDeleteSpam = data.autoDeleteSpamEnabled;
          _autoSendReplies = data.autoSendRepliesEnabled;
        });
      }
    });
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(userSettingsStateProvider.notifier).save(
            autoDeleteSpamEnabled: _autoDeleteSpam,
            autoSendRepliesEnabled: _autoSendReplies,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Paramètres mis à jour')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final settingsAsync = ref.watch(userSettingsStateProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Paramètres')),
      body: settingsAsync.when(
        data: (settings) {
          _autoDeleteSpam ??= settings.autoDeleteSpamEnabled;
          _autoSendReplies ??= settings.autoSendRepliesEnabled;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              SwitchListTile(
                title: const Text('Supprimer automatiquement les spams'),
                value: _autoDeleteSpam ?? false,
                onChanged: (v) => setState(() => _autoDeleteSpam = v),
              ),
              const Divider(),
              SwitchListTile(
                title: const Text('Répondre automatiquement aux messages'),
                value: _autoSendReplies ?? false,
                onChanged: (v) => setState(() => _autoSendReplies = v),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _saving ? null : _save,
                icon: const Icon(Icons.save),
                label: _saving
                    ? const Text('Enregistrement...')
                    : const Text('Enregistrer'),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Erreur de chargement: $err'),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () =>
                    ref.read(userSettingsStateProvider.notifier).refresh(),
                child: const Text('Réessayer'),
              )
            ],
          ),
        ),
      ),
    );
  }
}
