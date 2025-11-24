import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../services/api_client.dart';

/// Analytics Dashboard Screen
/// Task: T076 - Create analytics dashboard screen
/// Task: T077 - Implement charts for response times, message volumes, channel breakdown
/// Task: T078 - Add date range selector for custom analytics periods
/// Task: T079 - Display top contacts list
///
/// Displays communication analytics with charts and metrics

enum DateRangePeriod { day, week, month, custom }

class AnalyticsDashboardScreen extends ConsumerStatefulWidget {
  const AnalyticsDashboardScreen({super.key});

  @override
  ConsumerState<AnalyticsDashboardScreen> createState() =>
      _AnalyticsDashboardScreenState();
}

class _AnalyticsDashboardScreenState
    extends ConsumerState<AnalyticsDashboardScreen> {
  DateRangePeriod _selectedPeriod = DateRangePeriod.month;
  DateTime? _customStartDate;
  DateTime? _customEndDate;

  bool _isLoading = true;

  // Analytics data
  Map<String, dynamic>? _summary;
  Map<String, dynamic>? _responseTimes;
  List<dynamic>? _platformBreakdown;
  List<dynamic>? _topContacts;

  @override
  void initState() {
    super.initState();
    _loadAnalytics();
  }

  Future<void> _loadAnalytics() async {
    setState(() => _isLoading = true);

    try {
      final dates = _getDateRange();
      final apiClient = ref.read(apiClientProvider);

      // Load all analytics in parallel
      final List<dynamic> results = await Future.wait<dynamic>([
        apiClient.getAnalyticsSummary(
          startDate: dates['start']!.toIso8601String(),
          endDate: dates['end']!.toIso8601String(),
        ),
        apiClient.getResponseTimes(
          startDate: dates['start']!.toIso8601String(),
          endDate: dates['end']!.toIso8601String(),
        ),
        apiClient.getPlatformBreakdown(
          startDate: dates['start']!.toIso8601String(),
          endDate: dates['end']!.toIso8601String(),
        ),
        apiClient.getTopContacts(
          startDate: dates['start']!.toIso8601String(),
          endDate: dates['end']!.toIso8601String(),
        ),
      ]);

      setState(() {
        _summary = results[0]['summary'];
        _responseTimes = results[1]['metrics'];
        _platformBreakdown = results[2]['breakdown'];
        _topContacts = results[3]['contacts'];
      });
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to load analytics: $error'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Map<String, DateTime> _getDateRange() {
    final now = DateTime.now();

    switch (_selectedPeriod) {
      case DateRangePeriod.day:
        return {
          'start': DateTime(now.year, now.month, now.day),
          'end': now,
        };
      case DateRangePeriod.week:
        return {
          'start': now.subtract(const Duration(days: 7)),
          'end': now,
        };
      case DateRangePeriod.month:
        return {
          'start': now.subtract(const Duration(days: 30)),
          'end': now,
        };
      case DateRangePeriod.custom:
        return {
          'start': _customStartDate ?? now.subtract(const Duration(days: 30)),
          'end': _customEndDate ?? now,
        };
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Analytics'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAnalytics,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          // Date range selector
          _buildDateRangeSelector(),

          if (_isLoading)
            const Expanded(
              child: Center(child: CircularProgressIndicator()),
            )
          else
            Expanded(
              child: RefreshIndicator(
                onRefresh: _loadAnalytics,
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    // Summary cards
                    _buildSummaryCards(),
                    const SizedBox(height: 24),

                    // Response time chart
                    _buildResponseTimeChart(),
                    const SizedBox(height: 24),

                    // Platform breakdown
                    _buildPlatformBreakdown(),
                    const SizedBox(height: 24),

                    // Top contacts
                    _buildTopContacts(),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildDateRangeSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Row(
        children: [
          Expanded(
            child: SegmentedButton<DateRangePeriod>(
              segments: const [
                ButtonSegment(
                  value: DateRangePeriod.day,
                  label: Text('Day'),
                ),
                ButtonSegment(
                  value: DateRangePeriod.week,
                  label: Text('Week'),
                ),
                ButtonSegment(
                  value: DateRangePeriod.month,
                  label: Text('Month'),
                ),
                ButtonSegment(
                  value: DateRangePeriod.custom,
                  label: Text('Custom'),
                ),
              ],
              selected: {_selectedPeriod},
              onSelectionChanged: (Set<DateRangePeriod> selection) {
                setState(() => _selectedPeriod = selection.first);
                if (_selectedPeriod != DateRangePeriod.custom) {
                  _loadAnalytics();
                }
              },
            ),
          ),
          if (_selectedPeriod == DateRangePeriod.custom) ...[
            const SizedBox(width: 8),
            IconButton(
              icon: const Icon(Icons.date_range),
              onPressed: _showDateRangePicker,
              tooltip: 'Select date range',
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _showDateRangePicker() async {
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
      initialDateRange: DateTimeRange(
        start: _customStartDate ?? DateTime.now().subtract(const Duration(days: 30)),
        end: _customEndDate ?? DateTime.now(),
      ),
    );

    if (range != null) {
      setState(() {
        _customStartDate = range.start;
        _customEndDate = range.end;
      });
      _loadAnalytics();
    }
  }

  Widget _buildSummaryCards() {
    if (_summary == null) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Overview',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildMetricCard(
                'Total Messages',
                _summary!['totalMessages'].toString(),
                Icons.email,
                Colors.blue,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildMetricCard(
                'Read Rate',
                '${_summary!['readRate'].toStringAsFixed(1)}%',
                Icons.mark_email_read,
                Colors.green,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildMetricCard(
                'Reply Rate',
                '${_summary!['replyRate'].toStringAsFixed(1)}%',
                Icons.reply,
                Colors.orange,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildMetricCard(
                'Avg Response',
                '${_summary!['avgResponseTime'].toStringAsFixed(1)}h',
                Icons.access_time,
                Colors.purple,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMetricCard(String label, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey,
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResponseTimeChart() {
    if (_responseTimes == null ||
        _responseTimes!['responseTimes'] == null ||
        (_responseTimes!['responseTimes'] as List).isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Response Times',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 16),
              const Center(
                child: Text('No response time data available'),
              ),
            ],
          ),
        ),
      );
    }

    final List<dynamic> data = _responseTimes!['responseTimes'];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Response Times',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Average: ${_responseTimes!['avgResponseTime']}h  •  Median: ${_responseTimes!['medianResponseTime']}h',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey,
                  ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: LineChart(
                LineChartData(
                  gridData: const FlGridData(show: true),
                  titlesData: FlTitlesData(
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          if (value.toInt() >= data.length) return const SizedBox.shrink();
                          final date = DateTime.parse(data[value.toInt()]['date']);
                          return Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              DateFormat('MM/dd').format(date),
                              style: const TextStyle(fontSize: 10),
                            ),
                          );
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                        getTitlesWidget: (value, meta) {
                          return Text(
                            '${value.toInt()}h',
                            style: const TextStyle(fontSize: 10),
                          );
                        },
                      ),
                    ),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: true),
                  lineBarsData: [
                    LineChartBarData(
                      spots: data
                          .asMap()
                          .entries
                          .map((e) => FlSpot(
                                e.key.toDouble(),
                                (e.value['avgTime'] as num).toDouble(),
                              ))
                          .toList(),
                      isCurved: true,
                      color: Colors.purple,
                      barWidth: 3,
                      dotData: const FlDotData(show: true),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlatformBreakdown() {
    if (_platformBreakdown == null || _platformBreakdown!.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Platform Distribution',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 200,
              child: PieChart(
                PieChartData(
                  sections: _platformBreakdown!.map<PieChartSectionData>((platform) {
                    final colors = [
                      Colors.blue,
                      Colors.green,
                      Colors.orange,
                      Colors.purple,
                      Colors.red,
                    ];
                    final index = _platformBreakdown!.indexOf(platform);
                    final color = colors[index % colors.length];

                    return PieChartSectionData(
                      value: (platform['count'] as num).toDouble(),
                      title: '${platform['percentage']}%',
                      color: color,
                      radius: 80,
                      titleStyle: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    );
                  }).toList(),
                  sectionsSpace: 2,
                  centerSpaceRadius: 40,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 16,
              runSpacing: 8,
              children: _platformBreakdown!.map<Widget>((platform) {
                final colors = [
                  Colors.blue,
                  Colors.green,
                  Colors.orange,
                  Colors.purple,
                  Colors.red,
                ];
                final index = _platformBreakdown!.indexOf(platform);
                final color = colors[index % colors.length];

                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 16,
                      height: 16,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${platform['platform']} (${platform['count']})',
                      style: const TextStyle(fontSize: 14),
                    ),
                  ],
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopContacts() {
    if (_topContacts == null || _topContacts!.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Top Contacts',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ..._topContacts!.map<Widget>((contact) {
              final lastInteraction = DateTime.parse(contact['lastInteraction']);

              return ListTile(
                contentPadding: EdgeInsets.zero,
                leading: CircleAvatar(
                  child: Text(
                    (contact['name'] as String).substring(0, 1).toUpperCase(),
                  ),
                ),
                title: Text(contact['name']),
                subtitle: Text(contact['email']),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${contact['messageCount']} messages',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Text(
                      DateFormat('MMM dd').format(lastInteraction),
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }
}
