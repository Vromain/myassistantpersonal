import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../models/category.dart';
import '../models/message.dart';
import '../providers/categories_provider.dart';
import '../providers/messages_provider.dart';
import '../services/message_repository.dart';
import '../widgets/priority_badge.dart';
import 'compose_reply_screen.dart';

/// Message Detail Screen
/// Task: T035 - Create message detail screen
/// Reference: specs/001-ai-communication-hub/plan.md

class MessageDetailScreen extends ConsumerWidget {
  final String messageId;

  const MessageDetailScreen({
    super.key,
    required this.messageId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final messageAsync = ref.watch(messageDetailProvider(messageId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Message'),
        actions: [
          IconButton(
            icon: const Icon(Icons.label_outline),
            tooltip: 'Assign Category',
            onPressed: () => _showCategorySelector(context, ref),
          ),
          IconButton(
            icon: const Icon(Icons.reply),
            tooltip: 'Reply',
            onPressed: () async {
              final messageAsync = ref.read(messageDetailProvider(messageId));
              final message = messageAsync.valueOrNull;

              if (message == null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Unable to load message details'),
                    backgroundColor: Colors.red,
                  ),
                );
                return;
              }

              // Navigate to compose screen
              await Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => ComposeReplyScreen(
                    originalMessage: message,
                  ),
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.archive_outlined),
            tooltip: 'Archive',
            onPressed: () async {
              await ref.read(messagesProvider.notifier).archive(messageId);
              if (context.mounted) {
                Navigator.pop(context);
              }
            },
          ),
        ],
      ),
      body: messageAsync.when(
        data: (message) {
          if (message == null) {
            return const Center(child: Text('Message not found'));
          }
          return _buildMessageContent(context, ref, message);
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48),
              const SizedBox(height: 16),
              Text('Error: $error'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMessageContent(
    BuildContext context,
    WidgetRef ref,
    Message message,
  ) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              border: Border(
                bottom: BorderSide(color: Colors.grey.shade200),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Priority badge
                Row(
                  children: [
                    PriorityBadge(
                      level: message.priorityLevel,
                      score: message.priorityScore,
                    ),
                    const Spacer(),
                    if (message.isUrgent)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.red.shade100,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.warning_amber_rounded,
                              size: 16,
                              color: Colors.red.shade700,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              'Urgent',
                              style: TextStyle(
                                color: Colors.red.shade700,
                                fontWeight: FontWeight.w600,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12),

                // Subject
                if (message.subject != null) ...[
                  Text(
                    message.subject!,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 12),
                ],

                // From
                Row(
                  children: [
                    CircleAvatar(
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
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            message.senderName,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          Text(
                            message.senderEmail,
                            style: TextStyle(
                              color: Colors.grey.shade600,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      timeago.format(message.timestamp),
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Content
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              message.content,
              style: const TextStyle(height: 1.5),
            ),
          ),

          // Attachments
          if (message.hasAttachments) ...[
            const Divider(),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Attachments (${message.attachments.length})',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 12),
                  ...message.attachments.map((attachment) {
                    return Card(
                      child: ListTile(
                        leading: const Icon(Icons.attachment),
                        title: Text(attachment.filename),
                        subtitle: Text(_formatFileSize(attachment.size)),
                        trailing: IconButton(
                          icon: const Icon(Icons.download),
                          onPressed: () {
                            // TODO: Download attachment
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Download coming soon'),
                              ),
                            );
                          },
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
          ],

          // AI Reply Suggestions
          const Divider(),
          _buildReplySuggestions(context, ref, messageId),

          const SizedBox(height: 100), // Spacer for FAB
        ],
      ),
    );
  }

  Widget _buildReplySuggestions(
    BuildContext context,
    WidgetRef ref,
    String messageId,
  ) {
    final repliesAsync = ref.watch(replySuggestionsProvider(messageId));

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, size: 20),
              const SizedBox(width: 8),
              Text(
                'AI Reply Suggestions',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ],
          ),
          const SizedBox(height: 12),
          repliesAsync.when(
            data: (replies) {
              if (replies.isEmpty) {
                return const Text('No suggestions available');
              }

              return Column(
                children: replies.map((reply) {
                  return Card(
                    child: InkWell(
                      onTap: () async {
                        final messageAsync = ref.read(messageDetailProvider(messageId));
                        final message = messageAsync.valueOrNull;

                        if (message == null) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Unable to load message details'),
                              backgroundColor: Colors.red,
                            ),
                          );
                          return;
                        }

                        // Navigate to compose screen with pre-filled reply
                        final result = await Navigator.of(context).push<bool>(
                          MaterialPageRoute(
                            builder: (context) => ComposeReplyScreen(
                              originalMessage: message,
                              prefilledContent: reply,
                            ),
                          ),
                        );

                        // If reply was sent successfully, show confirmation
                        if (result == true && context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Reply sent successfully'),
                              backgroundColor: Colors.green,
                            ),
                          );
                        }
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                reply,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const Icon(Icons.arrow_forward, size: 20),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (error, stack) => Text('Error loading suggestions: $error'),
          ),
        ],
      ),
    );
  }

  void _showCategorySelector(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.read(categoriesProvider);
    final messageAsync = ref.read(messageDetailProvider(messageId));
    final message = messageAsync.valueOrNull;

    if (message == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Unable to load message'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    categoriesAsync.whenData((categories) {
      showModalBottomSheet(
        context: context,
        builder: (context) => _CategorySelectorSheet(
          messageId: messageId,
          currentCategoryId: message.categoryId,
          categories: categories,
          onCategorySelected: (categoryId) async {
            try {
              await ref.read(messagesRepositoryProvider).assignCategory(
                    messageId,
                    categoryId,
                  );

              // Refresh message
              ref.invalidate(messageDetailProvider(messageId));
              ref.invalidate(messagesProvider);

              if (context.mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Category assigned successfully'),
                    backgroundColor: Colors.green,
                  ),
                );
              }
            } catch (e) {
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Failed to assign category: $e'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            }
          },
        ),
      );
    });
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}

class _CategorySelectorSheet extends StatelessWidget {
  final String messageId;
  final String? currentCategoryId;
  final List<Category> categories;
  final Function(String?) onCategorySelected;

  const _CategorySelectorSheet({
    required this.messageId,
    required this.currentCategoryId,
    required this.categories,
    required this.onCategorySelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Assign Category',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Remove category option
          if (currentCategoryId != null)
            ListTile(
              leading: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.clear, color: Colors.grey),
              ),
              title: const Text('Remove Category'),
              onTap: () => onCategorySelected(null),
            ),
          const Divider(),
          // Category list
          Flexible(
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: categories.length,
              itemBuilder: (context, index) {
                final category = categories[index];
                final isSelected = category.id == currentCategoryId;

                return ListTile(
                  leading: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: _hexToColor(category.color),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: category.icon != null
                        ? Center(
                            child: Text(
                              category.icon!,
                              style: const TextStyle(fontSize: 20),
                            ),
                          )
                        : null,
                  ),
                  title: Text(category.name),
                  subtitle: category.description != null
                      ? Text(category.description!)
                      : null,
                  trailing: isSelected
                      ? const Icon(Icons.check, color: Colors.green)
                      : null,
                  onTap: () => onCategorySelected(category.id),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Color _hexToColor(String hex) {
    final hexCode = hex.replaceAll('#', '');
    return Color(int.parse('FF$hexCode', radix: 16));
  }
}
