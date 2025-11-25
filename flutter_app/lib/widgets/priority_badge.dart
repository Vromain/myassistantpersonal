import 'package:flutter/material.dart';
import '../models/message.dart';

/// Priority Badge Widget
/// Task: T036 - Create priority badge widget
/// Displays message priority level with color coding

class PriorityBadge extends StatelessWidget {
  final PriorityLevel level;
  final int score;
  final bool compact;

  const PriorityBadge({
    super.key,
    required this.level,
    required this.score,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final config = _getPriorityConfig(level);

    if (compact) {
      return Container(
        width: 6,
        height: 6,
        decoration: BoxDecoration(
          color: config.color,
          shape: BoxShape.circle,
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: config.color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: config.color.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            config.icon,
            size: 16,
            color: config.color,
          ),
          const SizedBox(width: 6),
          Text(
            config.label,
            style: TextStyle(
              color: config.color,
              fontWeight: FontWeight.w600,
              fontSize: 12,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            '$score',
            style: TextStyle(
              color: config.color.withValues(alpha: 0.7),
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }

  _PriorityConfig _getPriorityConfig(PriorityLevel level) {
    switch (level) {
      case PriorityLevel.high:
        return _PriorityConfig(
          label: 'High',
          icon: Icons.arrow_upward,
          color: Colors.red.shade600,
        );
      case PriorityLevel.medium:
        return _PriorityConfig(
          label: 'Medium',
          icon: Icons.remove,
          color: Colors.orange.shade600,
        );
      case PriorityLevel.low:
        return _PriorityConfig(
          label: 'Low',
          icon: Icons.arrow_downward,
          color: Colors.green.shade600,
        );
    }
  }
}

class _PriorityConfig {
  final String label;
  final IconData icon;
  final Color color;

  _PriorityConfig({
    required this.label,
    required this.icon,
    required this.color,
  });
}
