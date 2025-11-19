import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/message.dart';
import '../providers/messages_provider.dart';

/// Compose Reply Screen
/// Task: T046 - Implement reply sending functionality
/// Reference: specs/001-ai-communication-hub/tasks.md
///
/// Allows users to compose and send replies to messages

class ComposeReplyScreen extends ConsumerStatefulWidget {
  final Message originalMessage;
  final String? prefilledContent;
  final bool replyAll;

  const ComposeReplyScreen({
    super.key,
    required this.originalMessage,
    this.prefilledContent,
    this.replyAll = false,
  });

  @override
  ConsumerState<ComposeReplyScreen> createState() => _ComposeReplyScreenState();
}

class _ComposeReplyScreenState extends ConsumerState<ComposeReplyScreen> {
  late final TextEditingController _contentController;
  bool _isSending = false;
  bool _replyAll = false;

  @override
  void initState() {
    super.initState();
    _contentController = TextEditingController(
      text: widget.prefilledContent ?? '',
    );
    _replyAll = widget.replyAll;
  }

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  Future<void> _sendReply() async {
    if (_contentController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a reply message'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _isSending = true;
    });

    try {
      await ref.read(messagesRepositoryProvider).sendReply(
            messageId: widget.originalMessage.id,
            content: _contentController.text.trim(),
            replyAll: _replyAll,
          );

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Reply sent successfully'),
          backgroundColor: Colors.green,
        ),
      );

      // Refresh messages list
      ref.invalidate(messagesProvider);

      Navigator.of(context).pop(true); // Return true to indicate success
    } catch (e) {
      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to send reply: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isSending = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Compose Reply'),
        actions: [
          if (_isSending)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            )
          else
            IconButton(
              icon: const Icon(Icons.send),
              onPressed: _sendReply,
              tooltip: 'Send',
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Original message context
            Card(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.reply, size: 16),
                        const SizedBox(width: 8),
                        Text(
                          'Replying to',
                          style: Theme.of(context).textTheme.labelMedium,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'From: ${widget.originalMessage.sender}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Subject: ${widget.originalMessage.subject ?? "(No Subject)"}',
                      style: Theme.of(context).textTheme.bodySmall,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Reply All toggle
            SwitchListTile(
              title: const Text('Reply All'),
              subtitle: const Text('Send reply to all recipients'),
              value: _replyAll,
              onChanged: _isSending
                  ? null
                  : (value) {
                      setState(() {
                        _replyAll = value;
                      });
                    },
            ),
            const SizedBox(height: 16),

            // Compose area
            TextField(
              controller: _contentController,
              enabled: !_isSending,
              maxLines: 15,
              decoration: InputDecoration(
                labelText: 'Your Reply',
                hintText: 'Type your message here...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                alignLabelWithHint: true,
              ),
              textInputAction: TextInputAction.newline,
              keyboardType: TextInputType.multiline,
            ),
            const SizedBox(height: 16),

            // Send button (also in app bar)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isSending ? null : _sendReply,
                icon: _isSending
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.send),
                label: Text(_isSending ? 'Sending...' : 'Send Reply'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
