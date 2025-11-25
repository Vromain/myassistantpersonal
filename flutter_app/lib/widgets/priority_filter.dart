import 'package:flutter/material.dart';
import '../models/message.dart';

/// Priority Filter Widget
/// Task: T036 - Create filter widgets
/// Allows filtering messages by priority level

class PriorityFilter extends StatelessWidget {
  final PriorityLevel? selectedPriority;
  final ValueChanged<PriorityLevel?> onChanged;

  const PriorityFilter({
    super.key,
    required this.selectedPriority,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _FilterChip(
          label: 'All',
          selected: selectedPriority == null,
          onSelected: (selected) {
            if (selected) onChanged(null);
          },
        ),
        _FilterChip(
          label: 'High',
          color: Colors.red.shade600,
          icon: Icons.arrow_upward,
          selected: selectedPriority == PriorityLevel.high,
          onSelected: (selected) {
            onChanged(selected ? PriorityLevel.high : null);
          },
        ),
        _FilterChip(
          label: 'Medium',
          color: Colors.orange.shade600,
          icon: Icons.remove,
          selected: selectedPriority == PriorityLevel.medium,
          onSelected: (selected) {
            onChanged(selected ? PriorityLevel.medium : null);
          },
        ),
        _FilterChip(
          label: 'Low',
          color: Colors.green.shade600,
          icon: Icons.arrow_downward,
          selected: selectedPriority == PriorityLevel.low,
          onSelected: (selected) {
            onChanged(selected ? PriorityLevel.low : null);
          },
        ),
      ],
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final Color? color;
  final IconData? icon;
  final bool selected;
  final ValueChanged<bool> onSelected;

  const _FilterChip({
    required this.label,
    this.color,
    this.icon,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final chipColor = color ?? Theme.of(context).colorScheme.primary;

    return FilterChip(
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 16, color: selected ? Colors.white : chipColor),
            const SizedBox(width: 4),
          ],
          Text(label),
        ],
      ),
      selected: selected,
      onSelected: onSelected,
      backgroundColor: Colors.transparent,
      selectedColor: chipColor,
      checkmarkColor: Colors.white,
      labelStyle: TextStyle(
        color: selected ? Colors.white : chipColor,
        fontWeight: FontWeight.w600,
      ),
      side: BorderSide(
        color: selected ? chipColor : chipColor.withValues(alpha: 0.3),
        width: 1.5,
      ),
    );
  }
}
