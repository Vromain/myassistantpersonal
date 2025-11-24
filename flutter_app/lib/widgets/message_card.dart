import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../models/message.dart';
import '../models/message_analysis.dart';
import '../models/category.dart';
import '../providers/categories_provider.dart';
import 'priority_badge.dart';
import 'analysis_badges.dart';

/// Message Card Widget
/// Task: T036 - Create message card widget
/// Displays a message in the inbox list

class MessageCard extends ConsumerWidget {
  final Message message;
  final MessageAnalysis? analysis;
  final VoidCallback? onTap;
  final Function(bool)? onMarkAsRead;
  final VoidCallback? onArchive;

  const MessageCard({
    super.key,
    required this.message,
    this.analysis,
    this.onTap,
    this.onMarkAsRead,
    this.onArchive,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Get category if message has one
    Category? category;
    if (message.categoryId != null) {
      final categoriesAsync = ref.watch(categoriesProvider);
      category = categoriesAsync.maybeWhen(
        data: (categories) => categories.firstWhere(
          (cat) => cat.id == message.categoryId,
          orElse: () => Category(
            id: '',
            name: 'Unknown',
            color: '#999999',
            isPredefined: false,
          ),
        ),
        orElse: () => null,
      );
    }
    return Card(
      elevation: message.readStatus ? 0 : 1,
      color: message.readStatus ? null : Theme.of(context).colorScheme.surface,
      child: InkWell(
        onTap: () {
          // Mark as read when tapped
          if (!message.readStatus && onMarkAsRead != null) {
            onMarkAsRead!(true);
          }
          onTap?.call();
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row
              Row(
                children: [
                  // Sender avatar
                  CircleAvatar(
                    radius: 20,
                    backgroundColor:
                        Theme.of(context).colorScheme.primaryContainer,
                    child: Text(
                      message.senderName[0].toUpperCase(),
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Sender name and time
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          message.senderName,
                          style: TextStyle(
                            fontWeight: message.readStatus
                                ? FontWeight.normal
                                : FontWeight.bold,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          timeago.format(message.timestamp),
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Priority badge
                  PriorityBadge(
                    level: message.priorityLevel,
                    score: message.priorityScore,
                    compact: true,
                  ),

                  // Unread indicator
                  if (!message.readStatus) ...[
                    const SizedBox(width: 8),
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primary,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 12),

              // Subject
              if (message.subject != null && message.subject!.isNotEmpty) ...[
                Text(
                  message.subject!,
                  style: TextStyle(
                    fontWeight:
                        message.readStatus ? FontWeight.normal : FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
              ],

              // Preview
              Text(
                message.preview,
                style: TextStyle(
                  color: Colors.grey.shade700,
                  fontSize: 14,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),

              // Footer row (tags, actions)
              if (message.hasAttachments || message.isUrgent || category != null || analysis != null) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    // Category badge
                    if (category != null) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: _hexToColor(category.color).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _hexToColor(category.color).withOpacity(0.3),
                            width: 1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (category.icon != null) ...[
                              Text(
                                category.icon!,
                                style: const TextStyle(fontSize: 12),
                              ),
                              const SizedBox(width: 4),
                            ],
                            Text(
                              category.name,
                              style: TextStyle(
                                color: _hexToColor(category.color).computeLuminance() > 0.5
                                    ? Colors.black87
                                    : _hexToColor(category.color),
                                fontWeight: FontWeight.w600,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                    ],
                    if (message.isUrgent)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.warning_amber_rounded,
                              size: 14,
                              color: Colors.red.shade700,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'Urgent',
                              style: TextStyle(
                                color: Colors.red.shade700,
                                fontWeight: FontWeight.w600,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (message.hasAttachments) ...[
                      if (message.isUrgent || category != null) const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.attachment,
                              size: 14,
                              color: Colors.grey.shade700,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${message.attachments.length}',
                              style: TextStyle(
                                color: Colors.grey.shade700,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    // Analysis badges (spam, sentiment, response needed)
                    if (analysis != null) ...[
                      if (message.hasAttachments || message.isUrgent || category != null)
                        const SizedBox(width: 8),
                      AnalysisBadges(
                        analysis: analysis,
                        compact: true,
                      ),
                    ],
                    const Spacer(),
                    Text(
                      message.platform.name.toUpperCase(),
                      style: TextStyle(
                        color: Colors.grey.shade500,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Color _hexToColor(String hex) {
    final hexCode = hex.replaceAll('#', '');
    return Color(int.parse('FF$hexCode', radix: 16));
  }
}
