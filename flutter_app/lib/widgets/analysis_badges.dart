import 'package:flutter/material.dart';
import '../models/message_analysis.dart';

/// Analysis Badges Widget
/// Task: T033 - Display analysis badges on message cards
/// Shows spam, sentiment, and response indicators

class AnalysisBadges extends StatelessWidget {
  final MessageAnalysis? analysis;
  final bool compact;

  const AnalysisBadges({
    super.key,
    required this.analysis,
    this.compact = true,
  });

  @override
  Widget build(BuildContext context) {
    if (analysis == null) return const SizedBox.shrink();

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Spam badge (only if spam detected)
        if (analysis!.isLikelySpam) ...[
          _buildBadge(
            context,
            icon: Icons.block,
            label: compact ? '' : 'Spam',
            color: Colors.red,
            showLabel: !compact,
          ),
          if (!compact) const SizedBox(width: 8),
        ],

        // Sentiment badge
        _buildSentimentBadge(context),
        if (!compact || analysis!.needsResponse) const SizedBox(width: 8),

        // Response needed badge
        if (analysis!.needsResponse) ...[
          _buildBadge(
            context,
            icon: Icons.reply,
            label: compact ? '' : 'Réponse',
            color: Colors.orange,
            showLabel: !compact,
          ),
        ],
      ],
    );
  }

  Widget _buildSentimentBadge(BuildContext context) {
    IconData icon;
    MaterialColor color;
    String label;

    switch (analysis!.sentiment) {
      case Sentiment.positive:
        icon = Icons.sentiment_satisfied;
        color = Colors.green;
        label = compact ? '' : 'Positif';
        break;
      case Sentiment.neutral:
        icon = Icons.sentiment_neutral;
        color = Colors.grey;
        label = compact ? '' : 'Neutre';
        break;
      case Sentiment.negative:
        icon = Icons.sentiment_dissatisfied;
        color = Colors.red;
        label = compact ? '' : 'Négatif';
        break;
    }

    return _buildBadge(
      context,
      icon: icon,
      label: label,
      color: color,
      showLabel: !compact,
    );
  }

  Widget _buildBadge(
    BuildContext context, {
    required IconData icon,
    required String label,
    required MaterialColor color,
    required bool showLabel,
  }) {
    if (!showLabel) {
      // Compact mode: just icon
      return Icon(
        icon,
        size: 16,
        color: color.shade700,
      );
    }

    // Full mode: icon + label
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 8,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        color: color.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.shade200,
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 14,
            color: color.shade700,
          ),
          if (label.isNotEmpty) ...[
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                color: color.shade700,
                fontWeight: FontWeight.w600,
                fontSize: 11,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
