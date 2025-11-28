import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:pull_to_refresh/pull_to_refresh.dart';

import '../models/message.dart';
import '../providers/auth_provider.dart';
import '../providers/messages_provider.dart';
import '../widgets/analysis_filter.dart';
import '../widgets/message_card.dart';
import '../widgets/priority_filter.dart';
import '../widgets/statistics_card.dart';

/// Inbox Screen
/// Task: T034 - Create inbox screen with message list
/// Task: T038 - Implement sort by priority functionality
/// Task: T051 - Add StatisticsCard to inbox screen showing total messages and spam count
/// Reference: specs/001-ai-communication-hub/plan.dart

enum SortOption {
  priorityHighToLow,
  priorityLowToHigh,
  timestampNewest,
  timestampOldest,
}

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
  AnalysisFilterOptions _analysisFilters = const AnalysisFilterOptions();
  SortOption _sortBy = SortOption.timestampNewest;

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
          IconButton(
            icon: const Icon(Icons.settings),
            tooltip: 'Paramètres',
            onPressed: () => context.push('/settings'),
          ),
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
          // Sort button
          PopupMenuButton<SortOption>(
            icon: const Icon(Icons.sort),
            tooltip: 'Sort messages',
            onSelected: (SortOption option) {
              setState(() {
                _sortBy = option;
              });
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: SortOption.priorityHighToLow,
                child: Row(
                  children: [
                    Icon(
                      Icons.arrow_upward,
                      size: 18,
                      color: _sortBy == SortOption.priorityHighToLow
                          ? Theme.of(context).colorScheme.primary
                          : null,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Priority: High to Low',
                      style: _sortBy == SortOption.priorityHighToLow
                          ? TextStyle(
                              color: Theme.of(context).colorScheme.primary,
                              fontWeight: FontWeight.bold,
                            )
                          : null,
                    ),
                  ],
                ),
              ),
              PopupMenuItem(
                value: SortOption.priorityLowToHigh,
                child: Row(
                  children: [
                    Icon(
                      Icons.arrow_downward,
                      size: 18,
                      color: _sortBy == SortOption.priorityLowToHigh
                          ? Theme.of(context).colorScheme.primary
                          : null,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Priority: Low to High',
                      style: _sortBy == SortOption.priorityLowToHigh
                          ? TextStyle(
                              color: Theme.of(context).colorScheme.primary,
                              fontWeight: FontWeight.bold,
                            )
                          : null,
                    ),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              PopupMenuItem(
                value: SortOption.timestampNewest,
                child: Row(
                  children: [
                    Icon(
                      Icons.schedule,
                      size: 18,
                      color: _sortBy == SortOption.timestampNewest
                          ? Theme.of(context).colorScheme.primary
                          : null,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Newest First',
                      style: _sortBy == SortOption.timestampNewest
                          ? TextStyle(
                              color: Theme.of(context).colorScheme.primary,
                              fontWeight: FontWeight.bold,
                            )
                          : null,
                    ),
                  ],
                ),
              ),
              PopupMenuItem(
                value: SortOption.timestampOldest,
                child: Row(
                  children: [
                    Icon(
                      Icons.history,
                      size: 18,
                      color: _sortBy == SortOption.timestampOldest
                          ? Theme.of(context).colorScheme.primary
                          : null,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Oldest First',
                      style: _sortBy == SortOption.timestampOldest
                          ? TextStyle(
                              color: Theme.of(context).colorScheme.primary,
                              fontWeight: FontWeight.bold,
                            )
                          : null,
                    ),
                  ],
                ),
              ),
            ],
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
                case 'integrations':
                  if (context.mounted) context.push('/integrations');
                  break;
                case 'profile':
                  if (context.mounted) context.push('/profile');
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
                value: 'integrations',
                child: Row(
                  children: [
                    Icon(Icons.extension),
                    SizedBox(width: 12),
                    Text('Integrations'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'profile',
                child: Row(
                  children: [
                    Icon(Icons.person),
                    SizedBox(width: 12),
                    Text('Profile'),
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

    // Sort messages based on selected sort option
    final sortedMessages = _sortMessages(data.messages);

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
      child: CustomScrollView(
        slivers: [
          // Statistics Card at the top
          const SliverToBoxAdapter(
            child: StatisticsCard(),
          ),
          // Message list
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  if (index.isOdd) return const SizedBox(height: 12);
                  final messageIndex = index ~/ 2;
                  final message = sortedMessages[messageIndex];
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
                childCount: sortedMessages.length * 2 - 1,
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Message> _sortMessages(List<Message> messages) {
    // Create a mutable copy to sort
    final sortedList = List<Message>.from(messages);

    switch (_sortBy) {
      case SortOption.priorityHighToLow:
        sortedList.sort((a, b) {
          // High = 0, Medium = 1, Low = 2 in enum index
          // We want high first, so compare indices ascending
          return a.priorityLevel.index.compareTo(b.priorityLevel.index);
        });
        break;

      case SortOption.priorityLowToHigh:
        sortedList.sort((a, b) {
          // Low first, so compare indices descending
          return b.priorityLevel.index.compareTo(a.priorityLevel.index);
        });
        break;

      case SortOption.timestampNewest:
        sortedList.sort((a, b) {
          // Newest first, so compare timestamps descending
          return b.timestamp.compareTo(a.timestamp);
        });
        break;

      case SortOption.timestampOldest:
        sortedList.sort((a, b) {
          // Oldest first, so compare timestamps ascending
          return a.timestamp.compareTo(b.timestamp);
        });
        break;
    }

    return sortedList;
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

                // Analysis filter
                const Divider(),
                const SizedBox(height: 16),
                AnalysisFilter(
                  options: _analysisFilters,
                  onChanged: (filters) {
                    setState(() => _analysisFilters = filters);
                  },
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
                            _analysisFilters = const AnalysisFilterOptions();
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
                          // Note: For now, filters are only visual
                          // Full backend filtering integration would need API updates
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
