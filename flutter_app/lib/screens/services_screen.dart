import 'package:flutter/material.dart';
import 'dart:async';
import '../models/service_health.dart';
import '../services/services_service.dart';

/// Services Screen
/// Tasks: T015-T017 - Create Services page with health metrics display and auto-refresh
/// Feature: 002-intelligent-message-analysis

class ServicesScreen extends StatefulWidget {
  const ServicesScreen({super.key});

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  ServicesHealthResponse? _servicesHealth;
  bool _isLoading = true;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _loadServicesHealth();
    // T017: Auto-refresh every 30 seconds
    _refreshTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _loadServicesHealth(),
    );
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadServicesHealth() async {
    final servicesHealth = await ServicesService.getServicesHealth();
    if (mounted) {
      setState(() {
        _servicesHealth = servicesHealth;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Services'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _servicesHealth == null
              ? const Center(
                  child: Text('Erreur lors du chargement des services'),
                )
              : RefreshIndicator(
                  onRefresh: _loadServicesHealth,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'État des Services',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Dernière mise à jour: ${_formatTime(_servicesHealth!.timestamp)}',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Colors.grey[600],
                              ),
                        ),
                        const SizedBox(height: 24),
                        _buildServiceCard(
                          _servicesHealth!.services.backend,
                        ),
                        const SizedBox(height: 16),
                        _buildServiceCard(
                          _servicesHealth!.services.ollama,
                        ),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildServiceCard(ServiceHealth service) {
    final isHealthy = service.isOnline;
    final statusColor = isHealthy ? Colors.green : Colors.red;

    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  service.statusIcon,
                  style: const TextStyle(fontSize: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        service.serviceName,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: statusColor),
                        ),
                        child: Text(
                          service.statusDisplay,
                          style: TextStyle(
                            color: statusColor,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (service.endpoint != null) ...[
              _buildInfoRow('Endpoint', service.endpoint!),
              const SizedBox(height: 8),
            ],
            if (service.responseTime != null) ...[
              _buildInfoRow(
                'Temps de réponse',
                '${service.responseTime}ms',
              ),
              const SizedBox(height: 8),
            ],
            _buildInfoRow(
              'Dernière vérification',
              _formatTime(service.lastCheckTimestamp.toIso8601String()),
            ),
            if (service.metadata != null && service.metadata!.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Divider(),
              const SizedBox(height: 12),
              Text(
                'Détails',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              const SizedBox(height: 8),
              ...service.metadata!.entries.map((entry) {
                final value = entry.value;
                final displayValue = value is List
                    ? value.join(', ')
                    : value.toString();
                return Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: _buildInfoRow(_formatKey(entry.key), displayValue),
                );
              }),
            ],
            if (service.errorMessage != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.withOpacity(0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        service.errorMessage!,
                        style: const TextStyle(color: Colors.red),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 160,
          child: Text(
            label,
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 13,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w500,
              fontSize: 13,
            ),
          ),
        ),
      ],
    );
  }

  String _formatKey(String key) {
    // Convert camelCase to Title Case
    final result = key.replaceAllMapped(
      RegExp(r'([A-Z])'),
      (match) => ' ${match.group(0)}',
    );
    return result[0].toUpperCase() + result.substring(1);
  }

  String _formatTime(String timestamp) {
    try {
      final dateTime = DateTime.parse(timestamp);
      final now = DateTime.now();
      final difference = now.difference(dateTime);

      if (difference.inSeconds < 60) {
        return 'Il y a ${difference.inSeconds}s';
      } else if (difference.inMinutes < 60) {
        return 'Il y a ${difference.inMinutes}min';
      } else {
        return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
      }
    } catch (e) {
      return timestamp;
    }
  }
}
