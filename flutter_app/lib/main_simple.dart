import 'package:flutter/material.dart';
// Note: dart:html import causes issues, using url_launcher instead
import 'package:url_launcher/url_launcher.dart';

import 'screens/services_screen.dart';
import 'screens/settings_screen.dart';
import 'services/accounts_service.dart';
import 'services/auth_service.dart';
import 'utils/env.dart';

void main() {
  runApp(const CommunicationHubApp());
}

class CommunicationHubApp extends StatelessWidget {
  const CommunicationHubApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: Env.appName,
      theme: _buildTheme(),
      home: const AuthWrapper(),
      debugShowCheckedModeBanner: false,
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
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  void _handleMenuSelection(BuildContext context, String value) async {
    switch (value) {
      case 'profile':
        await _showProfileDialog(context);
        break;
      case 'integrations':
        _showIntegrationsDialog(context);
        break;
      case 'services':
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const ServicesScreen()),
        );
        break;
      case 'settings':
        // Task: T053 - Add Settings navigation to user dropdown menu
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const SettingsScreen()),
        );
        break;
      case 'logout':
        await _handleLogout(context);
        break;
    }
  }

  Future<void> _handleLogout(BuildContext context) async {
    await AuthService.logout();
    if (context.mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const AuthWrapper()),
        (route) => false,
      );
    }
  }

  Future<void> _showProfileDialog(BuildContext context) async {
    final user = await AuthService.getUser();

    if (!context.mounted) return;

    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.person),
              SizedBox(width: 12),
              Text('Profil'),
            ],
          ),
          content: SizedBox(
            width: 400,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Email: ${user?['email'] ?? 'Non connecté'}',
                    style: const TextStyle(fontSize: 16)),
                const SizedBox(height: 12),
                Text('Nom: ${user?['displayName'] ?? 'N/A'}',
                    style: const TextStyle(fontSize: 16)),
                const SizedBox(height: 12),
                Text('Abonnement: ${user?['subscriptionTier'] ?? 'Free'}',
                    style: const TextStyle(fontSize: 16)),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Fermer'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _showIntegrationsDialog(BuildContext context) async {
    // Fetch connected accounts
    final accountsResult = await AccountsService.getAccounts();
    final accounts =
        accountsResult['success'] ? accountsResult['accounts'] as List : [];

    if (!context.mounted) return;

    showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              title: const Row(
                children: [
                  Icon(Icons.integration_instructions),
                  SizedBox(width: 12),
                  Text('Intégrations'),
                ],
              ),
              content: SizedBox(
                width: 600,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Comptes connectés',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () async {
                            final result = await AuthService.loginWithGoogle();
                            if (!mounted) return;
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  result['success'] == true
                                      ? 'Connexion Google réussie'
                                      : (result['error'] ??
                                          'Échec de la connexion Google'),
                                ),
                                backgroundColor: result['success'] == true
                                    ? Colors.green
                                    : Colors.red,
                              ),
                            );
                            if (result['success'] == true) {
                              Navigator.of(this.context).pop();
                              _showIntegrationsDialog(this.context);
                            }
                          },
                          icon: const Icon(Icons.g_mobiledata, size: 20),
                          label: const Text('Connecter un compte Gmail'),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            backgroundColor: Colors.white,
                            foregroundColor: Colors.black87,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (accounts.isEmpty)
                        const Text('Aucun compte connecté',
                            style: TextStyle(color: Colors.grey))
                      else
                        ...accounts.map((account) => Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ExpansionTile(
                                leading: Icon(
                                  account['platform'] == 'gmail'
                                      ? Icons.email
                                      : Icons.settings_ethernet,
                                  color: account['platform'] == 'gmail'
                                      ? Colors.red
                                      : Colors.blue,
                                  size: 32,
                                ),
                                title: Text(
                                  account['email'] ?? account['displayName'],
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold),
                                ),
                                subtitle: Text(
                                    '${account['platform']} - ${account['syncStatus']}'),
                                children: [
                                  Padding(
                                    padding: const EdgeInsets.all(16.0),
                                    child: Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceEvenly,
                                      children: [
                                        ElevatedButton.icon(
                                          onPressed: () async {
                                            // Test connection
                                            final result = await AccountsService
                                                .testConnection(account['id']);
                                            if (!mounted) return;
                                            ScaffoldMessenger.of(this.context)
                                                .showSnackBar(
                                              SnackBar(
                                                content: Text(result['success']
                                                    ? result['message'] ??
                                                        'Connexion réussie!'
                                                    : result['error'] ??
                                                        'Échec du test'),
                                                backgroundColor:
                                                    result['success']
                                                        ? Colors.green
                                                        : Colors.red,
                                              ),
                                            );
                                          },
                                          icon: const Icon(Icons.wifi_tethering,
                                              size: 18),
                                          label: const Text('Tester'),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.blue,
                                            foregroundColor: Colors.white,
                                          ),
                                        ),
                                        if (account['platform'] == 'imap')
                                          ElevatedButton.icon(
                                            onPressed: () {
                                              Navigator.of(dialogContext).pop();
                                              _showEditImapDialog(
                                                  this.context, account);
                                            },
                                            icon: const Icon(Icons.edit,
                                                size: 18),
                                            label: const Text('Modifier'),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: Colors.orange,
                                              foregroundColor: Colors.white,
                                            ),
                                          ),
                                        ElevatedButton.icon(
                                          onPressed: () async {
                                            // Confirm deletion
                                            final confirm =
                                                await showDialog<bool>(
                                              context: this.context,
                                              builder: (BuildContext ctx) {
                                                return AlertDialog(
                                                  title: const Text(
                                                      'Confirmer la suppression'),
                                                  content: Text(
                                                      'Voulez-vous vraiment déconnecter le compte ${account['email'] ?? account['displayName']} ?'),
                                                  actions: [
                                                    TextButton(
                                                      onPressed: () =>
                                                          Navigator.of(ctx)
                                                              .pop(false),
                                                      child:
                                                          const Text('Annuler'),
                                                    ),
                                                    TextButton(
                                                      onPressed: () =>
                                                          Navigator.of(ctx)
                                                              .pop(true),
                                                      child: const Text(
                                                        'Supprimer',
                                                        style: TextStyle(
                                                            color: Colors.red),
                                                      ),
                                                    ),
                                                  ],
                                                );
                                              },
                                            );

                                            if (confirm == true) {
                                              final result =
                                                  await AccountsService
                                                      .disconnectAccount(
                                                          account['id']);
                                              if (result['success']) {
                                                if (!mounted) return;
                                                Navigator.of(this.context)
                                                    .pop();
                                                _showIntegrationsDialog(
                                                    this.context);
                                                ScaffoldMessenger.of(
                                                        this.context)
                                                    .showSnackBar(
                                                  const SnackBar(
                                                    content: Text(
                                                        'Compte déconnecté'),
                                                    backgroundColor:
                                                        Colors.green,
                                                  ),
                                                );
                                              }
                                            }
                                          },
                                          icon: const Icon(Icons.delete,
                                              size: 18),
                                          label: const Text('Supprimer'),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.red,
                                            foregroundColor: Colors.white,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            )),
                      const SizedBox(height: 24),
                      const Text(
                        'Ajouter un compte',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),
                      _buildIntegrationCard(
                        'Gmail',
                        'Connectez votre compte Gmail via OAuth',
                        Icons.email,
                        Colors.red,
                        () async {
                          Navigator.of(dialogContext).pop();
                          final url = Uri.parse(
                              '${Env.apiBaseUrl}/auth/gmail?state=web');
                          if (await canLaunchUrl(url)) {
                            await launchUrl(url, webOnlyWindowName: '_self');
                          }
                        },
                      ),
                      const SizedBox(height: 12),
                      _buildIntegrationCard(
                        'IMAP',
                        'Connectez n\'importe quel compte email',
                        Icons.settings_ethernet,
                        Colors.blue,
                        () {
                          Navigator.of(dialogContext).pop();
                          _showImapDialog(this.context);
                        },
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                  child: const Text('Fermer'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildIntegrationCard(
    String title,
    String description,
    IconData icon,
    Color color,
    VoidCallback? onConnect,
  ) {
    return Card(
      child: ListTile(
        leading: Icon(icon, color: color, size: 32),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(description),
        trailing: onConnect != null
            ? ElevatedButton(
                onPressed: onConnect,
                child: const Text('Connecter'),
              )
            : const Chip(label: Text('Bientôt')),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Communication Hub'),
        backgroundColor: Colors.blue,
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.account_circle),
            onSelected: (String value) {
              _handleMenuSelection(context, value);
            },
            itemBuilder: (BuildContext context) => [
              const PopupMenuItem<String>(
                value: 'profile',
                child: Row(
                  children: [
                    Icon(Icons.person, size: 20),
                    SizedBox(width: 12),
                    Text('Profil'),
                  ],
                ),
              ),
              const PopupMenuItem<String>(
                value: 'integrations',
                child: Row(
                  children: [
                    Icon(Icons.integration_instructions, size: 20),
                    SizedBox(width: 12),
                    Text('Intégrations'),
                  ],
                ),
              ),
              const PopupMenuItem<String>(
                value: 'services',
                child: Row(
                  children: [
                    Icon(Icons.health_and_safety, size: 20),
                    SizedBox(width: 12),
                    Text('Services'),
                  ],
                ),
              ),
              const PopupMenuItem<String>(
                value: 'settings',
                child: Row(
                  children: [
                    Icon(Icons.settings, size: 20),
                    SizedBox(width: 12),
                    Text('Paramètres'),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem<String>(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 20, color: Colors.red),
                    SizedBox(width: 12),
                    Text('Déconnexion', style: TextStyle(color: Colors.red)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.email,
                size: 100,
                color: Color(0xFF4A90E2),
              ),
              const SizedBox(height: 32),
              const Text(
                'AI-Powered Communication Hub',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                'Centralisez tous vos emails avec l\'intelligence artificielle',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey.shade700,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              Card(
                elevation: 2,
                color: Colors.blue.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.integration_instructions,
                        size: 48,
                        color: Color(0xFF4A90E2),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Commencez par connecter vos comptes',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Cliquez sur l\'icône de profil en haut à droite\net sélectionnez "Intégrations"',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey.shade700,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 20),
                      ElevatedButton.icon(
                        onPressed: () {
                          _showIntegrationsDialog(context);
                        },
                        icon: const Icon(Icons.integration_instructions),
                        label: const Text('Voir les intégrations'),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 32, vertical: 16),
                          textStyle: const TextStyle(fontSize: 16),
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: 320,
                        child: ElevatedButton.icon(
                          onPressed: () async {
                            final result = await AuthService.loginWithGoogle();
                            if (!mounted) return;
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  result['success'] == true
                                      ? 'Compte Google connecté'
                                      : (result['error'] ??
                                          'Échec de la connexion Google'),
                                ),
                                backgroundColor: result['success'] == true
                                    ? Colors.green
                                    : Colors.red,
                              ),
                            );
                            if (result['success'] == true) {
                              _showIntegrationsDialog(this.context);
                            }
                          },
                          icon: const Icon(Icons.g_mobiledata, size: 20),
                          label: const Text('Se connecter avec Google'),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            backgroundColor: Colors.white,
                            foregroundColor: Colors.black87,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _buildFeatureChip(Icons.smart_toy, 'IA intégrée'),
                  const SizedBox(width: 12),
                  _buildFeatureChip(Icons.priority_high, 'Priorisation'),
                  const SizedBox(width: 12),
                  _buildFeatureChip(Icons.category, 'Catégorisation'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showImapDialog(BuildContext context) {
    final TextEditingController emailController = TextEditingController();
    final TextEditingController passwordController = TextEditingController();
    final TextEditingController hostController = TextEditingController();
    final TextEditingController portController =
        TextEditingController(text: '993');

    showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return StatefulBuilder(
          builder: (context, setState) {
            bool isLoading = false;

            return AlertDialog(
              title: const Text('Connect IMAP Account'),
              content: SingleChildScrollView(
                child: SizedBox(
                  width: 400,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextField(
                        controller: emailController,
                        decoration: const InputDecoration(
                          labelText: 'Email Address',
                          hintText: 'user@example.com',
                          prefixIcon: Icon(Icons.email),
                        ),
                        enabled: !isLoading,
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: passwordController,
                        decoration: const InputDecoration(
                          labelText: 'Password',
                          hintText: 'Your email password',
                          prefixIcon: Icon(Icons.lock),
                        ),
                        obscureText: true,
                        enabled: !isLoading,
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: hostController,
                        decoration: const InputDecoration(
                          labelText: 'IMAP Host',
                          hintText: 'imap.example.com',
                          prefixIcon: Icon(Icons.dns),
                        ),
                        enabled: !isLoading,
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: portController,
                        decoration: const InputDecoration(
                          labelText: 'IMAP Port',
                          hintText: '993',
                          prefixIcon: Icon(Icons.settings_ethernet),
                        ),
                        keyboardType: TextInputType.number,
                        enabled: !isLoading,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Common IMAP servers:\n'
                        '• Gmail: imap.gmail.com:993\n'
                        '• Outlook: outlook.office365.com:993\n'
                        '• Yahoo: imap.mail.yahoo.com:993\n'
                        '• OVH: imap.mail.ovh.net:993',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                      Visibility(
                        visible: isLoading,
                        child: const Column(
                          children: [
                            SizedBox(height: 16),
                            CircularProgressIndicator(),
                            SizedBox(height: 8),
                            Text('Connecting...',
                                style: TextStyle(color: Colors.blue)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    if (isLoading) return;
                    Navigator.of(dialogContext).pop();
                  },
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    if (isLoading) return;
                    // Connect to IMAP
                    final email = emailController.text.trim();
                    final password = passwordController.text;
                    final host = hostController.text.trim();
                    final port = int.tryParse(portController.text) ?? 993;

                    if (email.isEmpty || password.isEmpty || host.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Please fill all fields'),
                          backgroundColor: Colors.red,
                        ),
                      );
                      return;
                    }

                    // Set loading state
                    setState(() {
                      isLoading = true;
                    });

                    // Call the API
                    final result = await AccountsService.connectImap(
                      email: email,
                      password: password,
                      host: host,
                      port: port,
                      secure: true,
                    );

                    // Reset loading state
                    setState(() {
                      isLoading = false;
                    });

                    if (result['success']) {
                      if (!mounted) return;
                      Navigator.of(this.context).pop();
                      ScaffoldMessenger.of(this.context).showSnackBar(
                        const SnackBar(
                          content: Text('Compte IMAP connecté avec succès!'),
                          backgroundColor: Colors.green,
                        ),
                      );
                      // Refresh integrations dialog to show new account
                      _showIntegrationsDialog(this.context);
                    } else {
                      if (!mounted) return;
                      ScaffoldMessenger.of(this.context).showSnackBar(
                        SnackBar(
                          content: Text(result['error'] ??
                              'Failed to connect IMAP account'),
                          backgroundColor: Colors.red,
                          duration: const Duration(seconds: 5),
                        ),
                      );
                    }
                  },
                  child: const Text('Connect'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showEditImapDialog(BuildContext context, Map<String, dynamic> account) {
    final TextEditingController emailController =
        TextEditingController(text: account['email'] ?? '');
    final TextEditingController passwordController = TextEditingController();
    final TextEditingController hostController =
        TextEditingController(text: account['imapConfig']?['host'] ?? '');
    final TextEditingController portController = TextEditingController(
        text: (account['imapConfig']?['port'] ?? 993).toString());

    showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return StatefulBuilder(
          builder: (context, setState) {
            bool isLoading = false;

            return AlertDialog(
              title: const Text('Modifier le compte IMAP'),
              content: SingleChildScrollView(
                child: SizedBox(
                  width: 400,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextField(
                        controller: emailController,
                        decoration: const InputDecoration(
                          labelText: 'Adresse email',
                          hintText: 'user@example.com',
                          prefixIcon: Icon(Icons.email),
                        ),
                        enabled: !isLoading,
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: passwordController,
                        decoration: const InputDecoration(
                          labelText:
                              'Mot de passe (laisser vide pour ne pas changer)',
                          hintText: 'Nouveau mot de passe',
                          prefixIcon: Icon(Icons.lock),
                        ),
                        obscureText: true,
                        enabled: !isLoading,
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: hostController,
                        decoration: const InputDecoration(
                          labelText: 'Hôte IMAP',
                          hintText: 'imap.example.com',
                          prefixIcon: Icon(Icons.dns),
                        ),
                        enabled: !isLoading,
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: portController,
                        decoration: const InputDecoration(
                          labelText: 'Port IMAP',
                          hintText: '993',
                          prefixIcon: Icon(Icons.settings_ethernet),
                        ),
                        keyboardType: TextInputType.number,
                        enabled: !isLoading,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Serveurs IMAP courants:\n'
                        '• Gmail: imap.gmail.com:993\n'
                        '• Outlook: outlook.office365.com:993\n'
                        '• Yahoo: imap.mail.yahoo.com:993\n'
                        '• OVH: imap.mail.ovh.net:993',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                      Visibility(
                        visible: isLoading,
                        child: const Column(
                          children: [
                            SizedBox(height: 16),
                            CircularProgressIndicator(),
                            SizedBox(height: 8),
                            Text('Mise à jour en cours...',
                                style: TextStyle(color: Colors.blue)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    if (isLoading) return;
                    Navigator.of(dialogContext).pop();
                  },
                  child: const Text('Annuler'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    if (isLoading) return;
                    final email = emailController.text.trim();
                    final password = passwordController.text;
                    final host = hostController.text.trim();
                    final port = int.tryParse(portController.text) ?? 993;

                    if (email.isEmpty || host.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('L\'email et l\'hôte sont requis'),
                          backgroundColor: Colors.red,
                        ),
                      );
                      return;
                    }

                    // Si le mot de passe est vide, on ne le met pas à jour
                    if (password.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                              'Veuillez entrer un mot de passe pour mettre à jour le compte'),
                          backgroundColor: Colors.orange,
                        ),
                      );
                      return;
                    }

                    setState(() {
                      isLoading = true;
                    });

                    final result = await AccountsService.updateImapAccount(
                      accountId: account['id'],
                      email: email,
                      password: password,
                      host: host,
                      port: port,
                      secure: true,
                    );

                    setState(() {
                      isLoading = false;
                    });

                    if (result['success']) {
                      if (!mounted) return;
                      Navigator.of(this.context).pop();
                      ScaffoldMessenger.of(this.context).showSnackBar(
                        const SnackBar(
                          content: Text('Compte IMAP mis à jour avec succès!'),
                          backgroundColor: Colors.green,
                        ),
                      );
                      _showIntegrationsDialog(this.context);
                    } else {
                      if (!mounted) return;
                      ScaffoldMessenger.of(this.context).showSnackBar(
                        SnackBar(
                          content: Text(
                              result['error'] ?? 'Échec de la mise à jour'),
                          backgroundColor: Colors.red,
                          duration: const Duration(seconds: 5),
                        ),
                      );
                    }
                  },
                  child: const Text('Mettre à jour'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildFeatureChip(IconData icon, String label) {
    return Chip(
      avatar: Icon(icon, size: 18, color: const Color(0xFF4A90E2)),
      label: Text(label),
      backgroundColor: Colors.white,
    );
  }
}

// Auth Wrapper - checks if user is logged in
class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  bool _isLoggedIn = false;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkAuthStatus();
    _captureWebTokenIfPresent();
  }

  Future<void> _checkAuthStatus() async {
    final loggedIn = await AuthService.isLoggedIn();
    setState(() {
      _isLoggedIn = loggedIn;
      _isLoading = false;
    });
  }

  Future<void> _captureWebTokenIfPresent() async {
    final uri = Uri.base;
    final token = uri.queryParameters['token'];
    if (token != null && token.isNotEmpty) {
      await AuthService.saveTokenFromWebCallback(token);
      setState(() {
        _isLoggedIn = true;
      });
      await launchUrl(Uri.parse('/'), webOnlyWindowName: '_self');
    }
  }

  void _onLoginSuccess() {
    setState(() {
      _isLoggedIn = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return _isLoggedIn
        ? const HomeScreen()
        : LoginPage(onLoginSuccess: _onLoginSuccess);
  }
}

// Login/Register Page
class LoginPage extends StatefulWidget {
  final VoidCallback onLoginSuccess;

  const LoginPage({super.key, required this.onLoginSuccess});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _displayNameController = TextEditingController();
  bool _isLogin = true;
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleSubmit() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final email = _emailController.text.trim();
      final password = _passwordController.text;

      if (email.isEmpty || password.isEmpty) {
        setState(() {
          _errorMessage = 'Email et mot de passe requis';
          _isLoading = false;
        });
        return;
      }

      Map<String, dynamic> result;

      if (_isLogin) {
        result = await AuthService.login(email: email, password: password);
      } else {
        final displayName = _displayNameController.text.trim();
        if (displayName.isEmpty) {
          setState(() {
            _errorMessage = 'Nom complet requis';
            _isLoading = false;
          });
          return;
        }
        result = await AuthService.register(
          email: email,
          password: password,
          displayName: displayName,
        );
      }

      if (result['success']) {
        widget.onLoginSuccess();
      } else {
        setState(() {
          _errorMessage = result['error'] ?? 'Une erreur est survenue';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Erreur de connexion: $e';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 400),
          child: Card(
            margin: const EdgeInsets.all(24),
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.email,
                    size: 64,
                    color: Color(0xFF4A90E2),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    _isLogin ? 'Connexion' : 'Inscription',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 24),
                  TextField(
                    controller: _emailController,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.email),
                    ),
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _passwordController,
                    decoration: const InputDecoration(
                      labelText: 'Mot de passe',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.lock),
                    ),
                    obscureText: true,
                  ),
                  if (!_isLogin) ...[
                    const SizedBox(height: 16),
                    TextField(
                      controller: _displayNameController,
                      decoration: const InputDecoration(
                        labelText: 'Nom complet',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.person),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  if (_errorMessage != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: Colors.red),
                      ),
                    ),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _handleSubmit,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.all(16),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(_isLogin ? 'Se connecter' : 'S\'inscrire'),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _isLogin = !_isLogin;
                        _errorMessage = null;
                      });
                    },
                    child: Text(
                      _isLogin
                          ? 'Pas de compte ? S\'inscrire'
                          : 'Déjà un compte ? Se connecter',
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Divider(),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _isLoading
                          ? null
                          : () async {
                              setState(() {
                                _isLoading = true;
                                _errorMessage = null;
                              });
                              final result =
                                  await AuthService.loginWithGoogle();
                              if (mounted) {
                                if (result['success'] == true) {
                                  widget.onLoginSuccess();
                                } else {
                                  setState(() {
                                    _errorMessage = result['error'] ??
                                        'Échec de l\'authentification Google';
                                    _isLoading = false;
                                  });
                                }
                              }
                            },
                      icon: const Icon(Icons.g_mobiledata, size: 20),
                      label: const Text('Se connecter avec Google'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.all(16),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _displayNameController.dispose();
    super.dispose();
  }
}
