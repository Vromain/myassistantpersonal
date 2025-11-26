import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/accounts_service.dart';
import '../services/auth_service.dart';
import '../utils/env.dart';

class IntegrationsScreen extends ConsumerStatefulWidget {
  const IntegrationsScreen({super.key});

  @override
  ConsumerState<IntegrationsScreen> createState() => _IntegrationsScreenState();
}

class _IntegrationsScreenState extends ConsumerState<IntegrationsScreen> {
  bool _isLoading = false;
  List<dynamic> _accounts = const [];

  @override
  void initState() {
    super.initState();
    _loadAccounts();
  }

  Future<void> _loadAccounts() async {
    setState(() => _isLoading = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final token = await AuthService.getToken();
      if (token == null) {
        messenger.showSnackBar(
          const SnackBar(content: Text('Veuillez vous connecter')),
        );
        return;
      }

      final result = await AccountsService.getAccounts();
      if (result['success'] == true) {
        setState(() {
          _accounts = (result['accounts'] as List?) ?? const [];
        });
      } else {
        messenger.showSnackBar(
          SnackBar(content: Text(result['error'] ?? 'Erreur de chargement')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _connectGmail() async {
    final url = Uri.parse('${Env.apiBaseUrl}/auth/gmail?state=web');
    await launchUrl(url, webOnlyWindowName: '_self');
  }

  Future<void> _showImapDialog() async {
    final messenger = ScaffoldMessenger.of(context);
    final emailController = TextEditingController();
    final passwordController = TextEditingController();
    final hostController = TextEditingController();
    final portController = TextEditingController(text: '993');
    bool isLoading = false;

    await showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(builder: (ctx, setDialogState) {
          return AlertDialog(
            title: const Text('Connecter un compte IMAP'),
            content: SingleChildScrollView(
              child: Column(
                children: [
                  TextField(
                    controller: emailController,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      prefixIcon: Icon(Icons.email),
                    ),
                    enabled: !isLoading,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: passwordController,
                    decoration: const InputDecoration(
                      labelText: 'Mot de passe',
                      prefixIcon: Icon(Icons.lock),
                    ),
                    obscureText: true,
                    enabled: !isLoading,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: hostController,
                    decoration: const InputDecoration(
                      labelText: 'Hôte IMAP',
                      prefixIcon: Icon(Icons.dns),
                    ),
                    enabled: !isLoading,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: portController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Port IMAP',
                      prefixIcon: Icon(Icons.settings_ethernet),
                    ),
                    enabled: !isLoading,
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: isLoading ? null : () => Navigator.of(ctx).pop(),
                child: const Text('Annuler'),
              ),
              ElevatedButton(
                onPressed: isLoading
                    ? null
                    : () async {
                        final email = emailController.text.trim();
                        final password = passwordController.text;
                        final host = hostController.text.trim();
                        final port = int.tryParse(portController.text) ?? 993;

                        if (email.isEmpty || password.isEmpty || host.isEmpty) {
                          messenger.showSnackBar(
                            const SnackBar(
                              content: Text('Veuillez remplir tous les champs'),
                              backgroundColor: Colors.red,
                            ),
                          );
                          return;
                        }

                        setDialogState(() => isLoading = true);
                        final result = await AccountsService.connectImap(
                          email: email,
                          password: password,
                          host: host,
                          port: port,
                          secure: true,
                        );
                        setDialogState(() => isLoading = false);
                        if (result['success'] == true) {
                          if (mounted) {
                            Navigator.of(context).pop();
                            await _loadAccounts();
                            messenger.showSnackBar(
                              SnackBar(
                                  content:
                                      Text(result['message'] ?? 'Connecté')),
                            );
                          }
                        } else {
                          messenger.showSnackBar(
                            SnackBar(
                                content: Text(
                                    result['error'] ?? 'Échec de connexion'),
                                backgroundColor: Colors.red),
                          );
                        }
                      },
                child: const Text('Connecter'),
              ),
            ],
          );
        });
      },
    );
  }

  Future<void> _disconnectAccount(String id) async {
    final messenger = ScaffoldMessenger.of(context);
    final result = await AccountsService.disconnectAccount(id);
    if (result['success'] == true) {
      await _loadAccounts();
      messenger.showSnackBar(
        SnackBar(content: Text(result['message'] ?? 'Compte déconnecté')),
      );
    } else {
      messenger.showSnackBar(
        SnackBar(
            content: Text(result['error'] ?? 'Échec de la déconnexion'),
            backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _testAccount(String id) async {
    final messenger = ScaffoldMessenger.of(context);
    final result = await AccountsService.testConnection(id);
    messenger.showSnackBar(
      SnackBar(
        content: Text(result['success'] == true
            ? (result['message'] ?? 'Connexion OK')
            : (result['error'] ?? 'Échec du test')),
        backgroundColor: result['success'] == true ? Colors.green : Colors.red,
      ),
    );
  }

  Future<void> _showEditImapDialog(Map<String, dynamic> account) async {
    final messenger = ScaffoldMessenger.of(context);
    final emailController =
        TextEditingController(text: account['email']?.toString() ?? '');
    final passwordController = TextEditingController();
    final hostController =
        TextEditingController(text: account['host']?.toString() ?? '');
    final portController =
        TextEditingController(text: (account['port']?.toString() ?? '993'));
    bool isLoading = false;

    await showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(builder: (ctx, setDialogState) {
          return AlertDialog(
            title: const Text('Modifier compte IMAP'),
            content: SingleChildScrollView(
              child: Column(
                children: [
                  TextField(
                    controller: emailController,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      prefixIcon: Icon(Icons.email),
                    ),
                    enabled: !isLoading,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: passwordController,
                    decoration: const InputDecoration(
                      labelText:
                          'Mot de passe (laisser vide pour ne pas changer)',
                      prefixIcon: Icon(Icons.lock),
                    ),
                    obscureText: true,
                    enabled: !isLoading,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: hostController,
                    decoration: const InputDecoration(
                      labelText: 'Hôte IMAP',
                      prefixIcon: Icon(Icons.dns),
                    ),
                    enabled: !isLoading,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: portController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Port IMAP',
                      prefixIcon: Icon(Icons.settings_ethernet),
                    ),
                    enabled: !isLoading,
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: isLoading ? null : () => Navigator.of(ctx).pop(),
                child: const Text('Annuler'),
              ),
              ElevatedButton(
                onPressed: isLoading
                    ? null
                    : () async {
                        final email = emailController.text.trim();
                        final password = passwordController.text;
                        final host = hostController.text.trim();
                        final port = int.tryParse(portController.text) ?? 993;
                        if (email.isEmpty || host.isEmpty) {
                          messenger.showSnackBar(
                            const SnackBar(
                                content: Text('Email et hôte requis'),
                                backgroundColor: Colors.red),
                          );
                          return;
                        }
                        if (password.isEmpty) {
                          messenger.showSnackBar(
                            const SnackBar(
                                content: Text(
                                    'Mot de passe requis pour mettre à jour'),
                                backgroundColor: Colors.orange),
                          );
                          return;
                        }
                        setDialogState(() => isLoading = true);
                        final result = await AccountsService.updateImapAccount(
                          accountId: account['id'].toString(),
                          email: email,
                          password: password,
                          host: host,
                          port: port,
                          secure: true,
                        );
                        setDialogState(() => isLoading = false);
                        if (result['success'] == true) {
                          if (mounted) {
                            Navigator.of(context).pop();
                            await _loadAccounts();
                            messenger.showSnackBar(
                              SnackBar(
                                  content: Text(result['message'] ??
                                      'Compte mis à jour')),
                            );
                          }
                        } else {
                          messenger.showSnackBar(
                            SnackBar(
                                content: Text(
                                    result['error'] ?? 'Échec de mise à jour'),
                                backgroundColor: Colors.red),
                          );
                        }
                      },
                child: const Text('Mettre à jour'),
              ),
            ],
          );
        });
      },
    );
  }

  Widget _buildIntegrationCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Ajouter une intégration',
                style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _connectGmail,
                    icon: const Icon(Icons.email),
                    label: const Text('Gmail'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _showImapDialog,
                    icon: const Icon(Icons.settings_ethernet),
                    label: const Text('IMAP'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Intégrations'),
        actions: [
          IconButton(
            onPressed: _loadAccounts,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadAccounts,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  _buildIntegrationCard(),
                  const SizedBox(height: 16),
                  if (_accounts.isEmpty)
                    Center(
                      child: Text(
                        'Aucun compte connecté',
                        style: TextStyle(color: Colors.grey.shade600),
                      ),
                    )
                  else
                    ..._accounts.map((account) {
                      final platform = account['platform']?.toString() ?? '';
                      final title = account['email']?.toString() ?? platform;
                      return Card(
                        child: ListTile(
                          leading: Icon(
                            platform == 'imap'
                                ? Icons.settings_ethernet
                                : Icons.email,
                          ),
                          title: Text(title),
                          subtitle: Text(platform.toUpperCase()),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.wifi_tethering),
                                tooltip: 'Tester',
                                onPressed: () =>
                                    _testAccount(account['id'].toString()),
                              ),
                              if (platform == 'imap')
                                IconButton(
                                  icon: const Icon(Icons.edit),
                                  tooltip: 'Modifier',
                                  onPressed: () => _showEditImapDialog(
                                      account as Map<String, dynamic>),
                                ),
                              IconButton(
                                icon:
                                    const Icon(Icons.delete, color: Colors.red),
                                tooltip: 'Supprimer',
                                onPressed: () async {
                                  final confirm = await showDialog<bool>(
                                    context: context,
                                    builder: (ctx) => AlertDialog(
                                      title:
                                          const Text('Supprimer l’intégration'),
                                      content: const Text(
                                          'Confirmer la suppression ?'),
                                      actions: [
                                        TextButton(
                                          onPressed: () =>
                                              Navigator.of(ctx).pop(false),
                                          child: const Text('Annuler'),
                                        ),
                                        TextButton(
                                          onPressed: () =>
                                              Navigator.of(ctx).pop(true),
                                          child: const Text('Supprimer'),
                                        ),
                                      ],
                                    ),
                                  );
                                  if (confirm == true) {
                                    await _disconnectAccount(
                                        account['id'].toString());
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }
}
