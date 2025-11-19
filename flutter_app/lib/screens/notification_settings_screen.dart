import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/notification_preferences.dart';
import '../services/notifications/notification_service.dart';

/// Notification Settings Screen
/// Task: T066 - Create notification preferences screen
/// Task: T067 - Add quiet hours configuration UI
/// Task: T068 - Implement notification rules UI
///
/// Allows users to configure notification preferences, quiet hours, and rules

class NotificationSettingsScreen extends ConsumerStatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  ConsumerState<NotificationSettingsScreen> createState() =>
      _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState
    extends ConsumerState<NotificationSettingsScreen> {
  NotificationPreferences? _preferences;
  bool _isLoading = true;
  bool _isSaving = false;

  // Quiet hours
  bool _quietHoursEnabled = false;
  TimeOfDay _startTime = const TimeOfDay(hour: 22, minute: 0);
  TimeOfDay _endTime = const TimeOfDay(hour: 7, minute: 0);
  String _timezone = 'UTC';

  // Notification rules
  String _priorityThreshold = 'medium';
  bool _rulesEnabled = true;
  final List<String> _keywords = [];
  final TextEditingController _keywordController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  @override
  void dispose() {
    _keywordController.dispose();
    super.dispose();
  }

  Future<void> _loadPreferences() async {
    setState(() => _isLoading = true);

    try {
      final notificationService = ref.read(notificationServiceProvider);
      final prefs = await notificationService.getPreferences();

      if (prefs != null) {
        setState(() {
          _preferences = prefs;

          // Load quiet hours
          if (prefs.quietHours != null) {
            _quietHoursEnabled = prefs.quietHours!.enabled;
            _startTime = _parseTimeString(prefs.quietHours!.startTime);
            _endTime = _parseTimeString(prefs.quietHours!.endTime);
            _timezone = prefs.quietHours!.timezone;
          }

          // Load notification rules
          if (prefs.notificationRules.isNotEmpty) {
            final rule = prefs.notificationRules.first;
            _priorityThreshold = rule.priorityThreshold;
            _rulesEnabled = rule.enabled;
            _keywords.addAll(rule.keywords);
          }
        });
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load preferences: $error'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _savePreferences() async {
    setState(() => _isSaving = true);

    try {
      final notificationService = ref.read(notificationServiceProvider);

      final newPreferences = NotificationPreferences(
        quietHours: QuietHours(
          enabled: _quietHoursEnabled,
          startTime: _formatTimeOfDay(_startTime),
          endTime: _formatTimeOfDay(_endTime),
          timezone: _timezone,
        ),
        notificationRules: [
          NotificationRule(
            priorityThreshold: _priorityThreshold,
            enabled: _rulesEnabled,
            keywords: _keywords,
          ),
        ],
        dataRetentionDays: _preferences?.dataRetentionDays ?? 90,
      );

      final success = await notificationService.updatePreferences(newPreferences);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success
                ? 'Preferences saved successfully'
                : 'Failed to save preferences'),
            backgroundColor: success ? Colors.green : Colors.red,
          ),
        );
      }

      if (success) {
        setState(() => _preferences = newPreferences);
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving preferences: $error'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isSaving = false);
    }
  }

  TimeOfDay _parseTimeString(String timeStr) {
    final parts = timeStr.split(':');
    return TimeOfDay(
      hour: int.parse(parts[0]),
      minute: int.parse(parts[1]),
    );
  }

  String _formatTimeOfDay(TimeOfDay time) {
    return '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Notification Settings')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notification Settings'),
        actions: [
          IconButton(
            icon: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.save),
            onPressed: _isSaving ? null : _savePreferences,
            tooltip: 'Save',
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Quiet Hours Section
          _buildQuietHoursSection(),
          const SizedBox(height: 24),

          // Notification Rules Section
          _buildNotificationRulesSection(),
          const SizedBox(height: 24),

          // Urgent Keywords Section
          _buildUrgentKeywordsSection(),
        ],
      ),
    );
  }

  Widget _buildQuietHoursSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.nightlight_round),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Quiet Hours',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                Switch(
                  value: _quietHoursEnabled,
                  onChanged: (value) {
                    setState(() => _quietHoursEnabled = value);
                  },
                ),
              ],
            ),
            if (_quietHoursEnabled) ...[
              const SizedBox(height: 16),
              const Text(
                'Low-priority notifications will be silenced during quiet hours. High-priority messages will always notify.',
                style: TextStyle(fontSize: 14, color: Colors.grey),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _buildTimeSelector(
                      label: 'Start Time',
                      time: _startTime,
                      onChanged: (time) {
                        setState(() => _startTime = time);
                      },
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildTimeSelector(
                      label: 'End Time',
                      time: _endTime,
                      onChanged: (time) {
                        setState(() => _endTime = time);
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Timezone: $_timezone',
                style: const TextStyle(fontSize: 14, color: Colors.grey),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTimeSelector({
    required String label,
    required TimeOfDay time,
    required ValueChanged<TimeOfDay> onChanged,
  }) {
    return InkWell(
      onTap: () async {
        final newTime = await showTimePicker(
          context: context,
          initialTime: time,
        );
        if (newTime != null) {
          onChanged(newTime);
        }
      },
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
        ),
        child: Text(
          time.format(context),
          style: const TextStyle(fontSize: 16),
        ),
      ),
    );
  }

  Widget _buildNotificationRulesSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.filter_alt),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Notification Rules',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                Switch(
                  value: _rulesEnabled,
                  onChanged: (value) {
                    setState(() => _rulesEnabled = value);
                  },
                ),
              ],
            ),
            if (_rulesEnabled) ...[
              const SizedBox(height: 16),
              const Text(
                'Only notify for messages above this priority:',
                style: TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 12),
              SegmentedButton<String>(
                segments: const [
                  ButtonSegment(
                    value: 'low',
                    label: Text('Low'),
                    icon: Icon(Icons.arrow_downward, size: 16),
                  ),
                  ButtonSegment(
                    value: 'medium',
                    label: Text('Medium'),
                    icon: Icon(Icons.remove, size: 16),
                  ),
                  ButtonSegment(
                    value: 'high',
                    label: Text('High'),
                    icon: Icon(Icons.arrow_upward, size: 16),
                  ),
                ],
                selected: {_priorityThreshold},
                onSelectionChanged: (Set<String> selection) {
                  setState(() => _priorityThreshold = selection.first);
                },
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildUrgentKeywordsSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.warning_amber),
                const SizedBox(width: 12),
                Text(
                  'Urgent Keywords',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              'Messages containing these keywords will always send notifications, bypassing quiet hours and priority filters.',
              style: TextStyle(fontSize: 14, color: Colors.grey),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _keywordController,
                    decoration: const InputDecoration(
                      labelText: 'Add keyword',
                      border: OutlineInputBorder(),
                      hintText: 'e.g., urgent, important',
                    ),
                    onSubmitted: (_) => _addKeyword(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: const Icon(Icons.add),
                  onPressed: _addKeyword,
                  tooltip: 'Add keyword',
                ),
              ],
            ),
            if (_keywords.isNotEmpty) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _keywords.map((keyword) {
                  return Chip(
                    label: Text(keyword),
                    deleteIcon: const Icon(Icons.close, size: 18),
                    onDeleted: () {
                      setState(() => _keywords.remove(keyword));
                    },
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _addKeyword() {
    final keyword = _keywordController.text.trim().toLowerCase();

    if (keyword.isEmpty) {
      return;
    }

    if (_keywords.contains(keyword)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Keyword already added'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _keywords.add(keyword);
      _keywordController.clear();
    });
  }
}
