import 'package:flutter/material.dart';
import '../models/message_analysis.dart';

/// Analysis Filter Widget
/// Task: T034 - Create analysis filter widget
/// Allows filtering messages by analysis status (spam, sentiment, response needed)

class AnalysisFilterOptions {
  final bool? showSpamOnly;
  final Sentiment? sentiment;
  final bool? needsResponse;

  const AnalysisFilterOptions({
    this.showSpamOnly,
    this.sentiment,
    this.needsResponse,
  });

  bool get hasActiveFilters =>
      showSpamOnly == true || sentiment != null || needsResponse == true;

  AnalysisFilterOptions copyWith({
    bool? showSpamOnly,
    Sentiment? sentiment,
    bool? needsResponse,
    bool clearSpam = false,
    bool clearSentiment = false,
    bool clearResponse = false,
  }) {
    return AnalysisFilterOptions(
      showSpamOnly: clearSpam ? null : (showSpamOnly ?? this.showSpamOnly),
      sentiment: clearSentiment ? null : (sentiment ?? this.sentiment),
      needsResponse: clearResponse ? null : (needsResponse ?? this.needsResponse),
    );
  }

  AnalysisFilterOptions clear() {
    return const AnalysisFilterOptions();
  }
}

class AnalysisFilter extends StatelessWidget {
  final AnalysisFilterOptions options;
  final ValueChanged<AnalysisFilterOptions> onChanged;

  const AnalysisFilter({
    super.key,
    required this.options,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Header with clear button
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Filtres d\'analyse',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            if (options.hasActiveFilters)
              TextButton.icon(
                onPressed: () => onChanged(options.clear()),
                icon: const Icon(Icons.clear_all, size: 18),
                label: const Text('Effacer'),
              ),
          ],
        ),
        const SizedBox(height: 12),

        // Spam filter
        Text(
          'Spam',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade700,
              ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _FilterChip(
              label: 'Tous',
              selected: options.showSpamOnly != true,
              onSelected: (selected) {
                if (selected) {
                  onChanged(options.copyWith(clearSpam: true));
                }
              },
            ),
            _FilterChip(
              label: 'Spam uniquement',
              color: Colors.red.shade600,
              icon: Icons.block,
              selected: options.showSpamOnly == true,
              onSelected: (selected) {
                onChanged(options.copyWith(
                  showSpamOnly: selected ? true : null,
                  clearSpam: !selected,
                ));
              },
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Sentiment filter
        Text(
          'Sentiment',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade700,
              ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _FilterChip(
              label: 'Tous',
              selected: options.sentiment == null,
              onSelected: (selected) {
                if (selected) {
                  onChanged(options.copyWith(clearSentiment: true));
                }
              },
            ),
            _FilterChip(
              label: 'Positif',
              color: Colors.green.shade600,
              icon: Icons.sentiment_satisfied,
              selected: options.sentiment == Sentiment.positive,
              onSelected: (selected) {
                onChanged(options.copyWith(
                  sentiment: selected ? Sentiment.positive : null,
                  clearSentiment: !selected,
                ));
              },
            ),
            _FilterChip(
              label: 'Neutre',
              color: Colors.grey.shade600,
              icon: Icons.sentiment_neutral,
              selected: options.sentiment == Sentiment.neutral,
              onSelected: (selected) {
                onChanged(options.copyWith(
                  sentiment: selected ? Sentiment.neutral : null,
                  clearSentiment: !selected,
                ));
              },
            ),
            _FilterChip(
              label: 'Négatif',
              color: Colors.red.shade600,
              icon: Icons.sentiment_dissatisfied,
              selected: options.sentiment == Sentiment.negative,
              onSelected: (selected) {
                onChanged(options.copyWith(
                  sentiment: selected ? Sentiment.negative : null,
                  clearSentiment: !selected,
                ));
              },
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Response needed filter
        Text(
          'Réponse nécessaire',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade700,
              ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _FilterChip(
              label: 'Tous',
              selected: options.needsResponse != true,
              onSelected: (selected) {
                if (selected) {
                  onChanged(options.copyWith(clearResponse: true));
                }
              },
            ),
            _FilterChip(
              label: 'Réponse requise',
              color: Colors.orange.shade600,
              icon: Icons.reply,
              selected: options.needsResponse == true,
              onSelected: (selected) {
                onChanged(options.copyWith(
                  needsResponse: selected ? true : null,
                  clearResponse: !selected,
                ));
              },
            ),
          ],
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
