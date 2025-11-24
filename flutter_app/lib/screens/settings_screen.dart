import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/user_settings.dart';
import '../services/settings_service.dart';

/// Settings Screen
/// Tasks: T049-T052 - Create SettingsScreen with backend integration
/// Reference: specs/002-intelligent-message-analysis/spec.md FR-008, FR-009
///
/// Provides UI for configuring:
/// - Auto-delete spam toggle
/// - Auto-send replies toggle
/// - Auto-reply conditions (whitelist, blacklist, business hours, max replies per day)
/// - Daily summary email preferences
class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  // Settings state
  bool _autoDeleteSpam = false;
  bool _autoSendReplies = false;
  bool _businessHoursOnly = false;
  bool _dailySummaryEnabled = true;
  double _maxRepliesPerDay = 10;
  int _spamThreshold = 80;
  int _responseConfidenceThreshold = 85;

  final TextEditingController _whitelistController = TextEditingController();
  final TextEditingController _blacklistController = TextEditingController();

  DateTime? _lastUpdated;
  bool _hasChanges = false;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  @override
  void dispose() {
    _whitelistController.dispose();
    _blacklistController.dispose();
    super.dispose();
  }

  /// Load settings from backend (T049)
  Future<void> _loadSettings() async {
    try {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });

      final settings = await SettingsService.getUserSettings();

      if (settings != null && mounted) {
        setState(() {
          _autoDeleteSpam = settings.autoDeleteSpamEnabled;
          _autoSendReplies = settings.autoSendRepliesEnabled;
          _spamThreshold = settings.spamThreshold;
          _responseConfidenceThreshold = settings.responseConfidenceThreshold;
          _businessHoursOnly = settings.businessHoursOnly;
          _maxRepliesPerDay = settings.maxRepliesPerDay.toDouble();
          _dailySummaryEnabled = settings.dailySummaryEnabled;
          _lastUpdated = settings.lastUpdated;

          // Update text controllers
          _whitelistController.text = settings.senderWhitelist.join('\n');
          _blacklistController.text = settings.senderBlacklist.join('\n');

          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Failed to load settings: ${e.toString()}';
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load settings: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _markChanged() {
    setState(() {
      _hasChanges = true;
    });
  }

  /// Save settings to backend (T050)
  Future<void> _saveSettings() async {
    try {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });

      // Parse whitelist and blacklist from text fields
      final whitelist = _whitelistController.text
          .split('\n')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList();

      final blacklist = _blacklistController.text
          .split('\n')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList();

      // Create settings object
      final settings = UserSettings(
        userId: '', // Will be filled by backend from auth token
        autoDeleteSpamEnabled: _autoDeleteSpam,
        autoSendRepliesEnabled: _autoSendReplies,
        spamThreshold: _spamThreshold,
        responseConfidenceThreshold: _responseConfidenceThreshold,
        senderWhitelist: whitelist,
        senderBlacklist: blacklist,
        businessHoursOnly: _businessHoursOnly,
        maxRepliesPerDay: _maxRepliesPerDay.toInt(),
        dailySummaryEnabled: _dailySummaryEnabled,
      );

      final updatedSettings = await SettingsService.updateUserSettings(settings);

      if (updatedSettings != null && mounted) {
        setState(() {
          _hasChanges = false;
          _lastUpdated = updatedSettings.lastUpdated ?? DateTime.now();
          _isLoading = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Settings saved successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Failed to save settings: ${e.toString()}';
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save settings: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _showAutoReplyConfirmation() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Enable Auto-Reply?'),
        content: const Text(
          'Automatic replies will be sent for messages requiring response. '
          'This feature should be used carefully. Are you sure you want to enable it?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange,
            ),
            child: const Text('Enable'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      setState(() {
        _autoSendReplies = true;
        _markChanged();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        actions: [
          if (_hasChanges && !_isLoading)
            TextButton.icon(
              onPressed: _saveSettings,
              icon: const Icon(Icons.save, color: Colors.white),
              label: const Text(
                'Save',
                style: TextStyle(color: Colors.white),
              ),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Message Management Section
          _buildSectionHeader('Message Management'),
          const SizedBox(height: 16),

          // Auto-delete spam
          _buildSettingCard(
            title: 'Auto-Delete Spam',
            subtitle: 'Automatically move spam messages to trash',
            icon: Icons.block,
            iconColor: Colors.red,
            child: Switch(
              value: _autoDeleteSpam,
              onChanged: (value) {
                setState(() {
                  _autoDeleteSpam = value;
                  _markChanged();
                });
              },
            ),
          ),

          // Spam threshold (only show if auto-delete is enabled)
          if (_autoDeleteSpam) ...[
            const SizedBox(height: 12),
            _buildSettingCard(
              title: 'Spam Detection Threshold',
              subtitle: '$_spamThreshold% confidence required to mark as spam',
              icon: Icons.tune,
              iconColor: Colors.orange,
              child: SizedBox(
                width: 200,
                child: Slider(
                  value: _spamThreshold.toDouble(),
                  min: 50,
                  max: 100,
                  divisions: 50,
                  label: _spamThreshold.toString(),
                  onChanged: (value) {
                    setState(() {
                      _spamThreshold = value.toInt();
                      _markChanged();
                    });
                  },
                ),
              ),
            ),
          ],

          const SizedBox(height: 12),

          // Auto-send replies
          _buildSettingCard(
            title: 'Auto-Send Replies',
            subtitle: 'Automatically send AI-generated replies',
            icon: Icons.auto_awesome,
            iconColor: Colors.orange,
            child: Switch(
              value: _autoSendReplies,
              onChanged: (value) {
                if (value && !_autoSendReplies) {
                  _showAutoReplyConfirmation();
                } else {
                  setState(() {
                    _autoSendReplies = value;
                    _markChanged();
                  });
                }
              },
            ),
          ),

          // Response confidence threshold (only show if auto-send is enabled)
          if (_autoSendReplies) ...[
            const SizedBox(height: 12),
            _buildSettingCard(
              title: 'Response Confidence Threshold',
              subtitle:
                  '$_responseConfidenceThreshold% confidence required to auto-send',
              icon: Icons.insights,
              iconColor: Colors.purple,
              child: SizedBox(
                width: 200,
                child: Slider(
                  value: _responseConfidenceThreshold.toDouble(),
                  min: 50,
                  max: 100,
                  divisions: 50,
                  label: _responseConfidenceThreshold.toString(),
                  onChanged: (value) {
                    setState(() {
                      _responseConfidenceThreshold = value.toInt();
                      _markChanged();
                    });
                  },
                ),
              ),
            ),
          ],

          // Auto-reply conditions (only show if auto-reply is enabled)
          if (_autoSendReplies) ...[
            const SizedBox(height: 24),
            _buildSectionHeader('Auto-Reply Conditions'),
            const SizedBox(height: 16),

            // Sender whitelist
            _buildTextFieldCard(
              title: 'Sender Whitelist (Optional)',
              hint: 'Enter email addresses, one per line',
              icon: Icons.check_circle_outline,
              iconColor: Colors.green,
              controller: _whitelistController,
              maxLines: 3,
              onChanged: (_) => _markChanged(),
            ),
            const SizedBox(height: 12),

            // Sender blacklist
            _buildTextFieldCard(
              title: 'Sender Blacklist (Required)',
              hint: 'Enter email addresses to never auto-reply, one per line',
              icon: Icons.block,
              iconColor: Colors.red,
              controller: _blacklistController,
              maxLines: 3,
              onChanged: (_) => _markChanged(),
            ),
            const SizedBox(height: 12),

            // Business hours only
            _buildSettingCard(
              title: 'Business Hours Only',
              subtitle: 'Only send auto-replies Monday-Friday, 9 AM - 5 PM',
              icon: Icons.access_time,
              iconColor: Colors.blue,
              child: Switch(
                value: _businessHoursOnly,
                onChanged: (value) {
                  setState(() {
                    _businessHoursOnly = value;
                    _markChanged();
                  });
                },
              ),
            ),
            const SizedBox(height: 12),

            // Max replies per day
            _buildSettingCard(
              title: 'Max Replies Per Day',
              subtitle: '${_maxRepliesPerDay.toInt()} replies per 24 hours',
              icon: Icons.send,
              iconColor: Colors.purple,
              child: SizedBox(
                width: 200,
                child: Slider(
                  value: _maxRepliesPerDay,
                  min: 1,
                  max: 100,
                  divisions: 99,
                  label: _maxRepliesPerDay.toInt().toString(),
                  onChanged: (value) {
                    setState(() {
                      _maxRepliesPerDay = value;
                      _markChanged();
                    });
                  },
                ),
              ),
            ),
          ],

          // Daily summary
          const SizedBox(height: 24),
          _buildSectionHeader('Notifications'),
          const SizedBox(height: 16),

          _buildSettingCard(
            title: 'Daily Summary Email',
            subtitle: 'Receive daily email with auto-action summaries',
            icon: Icons.email_outlined,
            iconColor: Colors.indigo,
            child: Switch(
              value: _dailySummaryEnabled,
              onChanged: (value) {
                setState(() {
                  _dailySummaryEnabled = value;
                  _markChanged();
                });
              },
            ),
          ),

          // Last updated timestamp
          if (_lastUpdated != null) ...[
            const SizedBox(height: 24),
            Center(
              child: Text(
                'Last updated: ${_formatDateTime(_lastUpdated!)}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey,
                    ),
              ),
            ),
          ],

          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
    );
  }

  Widget _buildSettingCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required Widget child,
  }) {
    return Card(
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: iconColor, size: 24),
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
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                  ),
                ],
              ),
            ),
            child,
          ],
        ),
      ),
    );
  }

  Widget _buildTextFieldCard({
    required String title,
    required String hint,
    required IconData icon,
    required Color iconColor,
    required TextEditingController controller,
    int maxLines = 1,
    void Function(String)? onChanged,
  }) {
    return Card(
      elevation: 1,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: iconColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: iconColor, size: 20),
                ),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              maxLines: maxLines,
              decoration: InputDecoration(
                hintText: hint,
                border: const OutlineInputBorder(),
                contentPadding: const EdgeInsets.all(12),
              ),
              onChanged: onChanged,
            ),
          ],
        ),
      ),
    );
  }

  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.day}/${dateTime.month}/${dateTime.year} at ${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}
