import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:pull_to_refresh/pull_to_refresh.dart';
import '../providers/messages_provider.dart';
import '../providers/auth_provider.dart';
import '../widgets/message_card.dart';
import '../widgets/priority_filter.dart';
import '../models/message.dart';

/// Inbox Screen
/// Task: T034 - Create inbox screen with message list
/// Reference: specs/001-ai-communication-hub/plan.dart

class InboxScreen extends ConsumerStatefulWidget {
  const InboxScreen({super.key});

  @override
  ConsumerState<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends ConsumerState<InboxScreen> {
  final RefreshController _refreshController =
      RefreshController(initialRefresh: false);
  PriorityLevel? _selectedPriority;
  bool? _showUnreadOnly;

  @override
  void dispose() {
    _refreshController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final messagesAsync = ref.watch(messagesProvider);
    final unreadCount = ref.watch(unreadCountProvider);

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Inbox'),
            unreadCount.when(
              data: (count) => Text(
                '$count unread',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey,
                    ),
              ),
              loading: () => const SizedBox.shrink(),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ],
        ),
        actions: [
          // Search button
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {
              showSearch(
                context: context,
                delegate: MessageSearchDelegate(ref),
              );
            },
          ),
          // Filter button
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () => _showFilterSheet(context),
          ),
          // Menu
          PopupMenuButton<String>(
            onSelected: (value) async {
              switch (value) {
                case 'sync':
                  await ref.read(messagesProvider.notifier).sync();
                  break;
                case 'logout':
                  await ref.read(authProvider.notifier).signOut();
                  if (context.mounted) {
                    context.go('/login');
                  }
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'sync',
                child: Row(
                  children: [
                    Icon(Icons.sync),
                    SizedBox(width: 12),
                    Text('Sync now'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout),
                    SizedBox(width: 12),
                    Text('Sign out'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: messagesAsync.when(
        data: (data) => _buildMessageList(data),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 48, color: Colors.red.shade300),
              const SizedBox(height: 16),
              Text(
                'Error loading messages',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                error.toString(),
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade600),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {
                  ref.invalidate(messagesProvider);
                },
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // TODO: Compose new message
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Compose feature coming soon')),
          );
        },
        child: const Icon(Icons.edit),
      ),
    );
  }

  Widget _buildMessageList(MessageListResponse data) {
    if (data.messages.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox_outlined, size: 64, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text(
              'No messages',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Colors.grey.shade600,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Pull down to sync',
              style: TextStyle(color: Colors.grey.shade500),
            ),
          ],
        ),
      );
    }

    return SmartRefresher(
      controller: _refreshController,
      enablePullDown: true,
      enablePullUp: data.hasMore,
      onRefresh: () async {
        await ref.read(messagesProvider.notifier).refresh();
        _refreshController.refreshCompleted();
      },
      onLoading: () async {
        await ref.read(messagesProvider.notifier).loadMore();
        _refreshController.loadComplete();
      },
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: data.messages.length,
        separatorBuilder: (context, index) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final message = data.messages[index];
          return MessageCard(
            message: message,
            onTap: () => context.push('/message/${message.id}'),
            onMarkAsRead: (readStatus) async {
              await ref
                  .read(messagesProvider.notifier)
                  .markAsRead(message.id, readStatus);
              ref.invalidate(unreadCountProvider);
            },
            onArchive: () async {
              await ref.read(messagesProvider.notifier).archive(message.id);
              ref.invalidate(unreadCountProvider);
            },
          );
        },
      ),
    );
  }

  void _showFilterSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) {
          return Container(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Filters',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 24),

                // Priority filter
                Text(
                  'Priority',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 12),
                PriorityFilter(
                  selectedPriority: _selectedPriority,
                  onChanged: (priority) {
                    setState(() => _selectedPriority = priority);
                  },
                ),
                const SizedBox(height: 24),

                // Unread filter
                CheckboxListTile(
                  title: const Text('Show unread only'),
                  value: _showUnreadOnly ?? false,
                  onChanged: (value) {
                    setState(() => _showUnreadOnly = value);
                  },
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                ),
                const SizedBox(height: 24),

                // Apply button
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          setState(() {
                            _selectedPriority = null;
                            _showUnreadOnly = null;
                          });
                          ref.read(messagesProvider.notifier).filter();
                          Navigator.pop(context);
                        },
                        child: const Text('Clear'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          ref.read(messagesProvider.notifier).filter(
                                priority: _selectedPriority,
                                readStatus:
                                    _showUnreadOnly == true ? false : null,
                              );
                          Navigator.pop(context);
                        },
                        child: const Text('Apply'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Message Search Delegate
class MessageSearchDelegate extends SearchDelegate<String> {
  final WidgetRef ref;

  MessageSearchDelegate(this.ref);

  @override
  List<Widget> buildActions(BuildContext context) {
    return [
      IconButton(
        icon: const Icon(Icons.clear),
        onPressed: () {
          query = '';
        },
      ),
    ];
  }

  @override
  Widget buildLeading(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.arrow_back),
      onPressed: () => close(context, ''),
    );
  }

  @override
  Widget buildResults(BuildContext context) {
    if (query.isEmpty) {
      return const Center(child: Text('Enter search query'));
    }

    // Trigger search
    ref.read(messagesProvider.notifier).search(query);

    return Consumer(
      builder: (context, ref, child) {
        final messagesAsync = ref.watch(messagesProvider);

        return messagesAsync.when(
          data: (data) {
            if (data.messages.isEmpty) {
              return const Center(child: Text('No results found'));
            }

            return ListView.builder(
              itemCount: data.messages.length,
              itemBuilder: (context, index) {
                final message = data.messages[index];
                return MessageCard(
                  message: message,
                  onTap: () {
                    close(context, message.id);
                    context.push('/message/${message.id}');
                  },
                );
              },
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stack) => Center(child: Text('Error: $error')),
        );
      },
    );
  }

  @override
  Widget buildSuggestions(BuildContext context) {
    return const Center(
      child: Text('Search your messages'),
    );
  }
}
