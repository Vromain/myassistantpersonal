import 'package:flutter/material.dart';
import '../models/message_analysis.dart';

/// Suggested Reply Card Widget
/// Task: T038-T048 - Display and edit AI-generated reply suggestions
/// Shows the AI-generated reply with edit and send capabilities

class SuggestedReplyCard extends StatefulWidget {
  final MessageAnalysis analysis;
  final VoidCallback? onSend;
  final VoidCallback? onReject;

  const SuggestedReplyCard({
    super.key,
    required this.analysis,
    this.onSend,
    this.onReject,
  });

  @override
  State<SuggestedReplyCard> createState() => _SuggestedReplyCardState();
}

class _SuggestedReplyCardState extends State<SuggestedReplyCard> {
  late TextEditingController _controller;
  bool _isEditing = false;
  bool _hasBeenEdited = false;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(
      text: widget.analysis.generatedReplyText ?? '',
    );
    _controller.addListener(() {
      if (!_hasBeenEdited && _controller.text != widget.analysis.generatedReplyText) {
        setState(() => _hasBeenEdited = true);
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.analysis.hasGeneratedReply) {
      return const SizedBox.shrink();
    }

    return Card(
      elevation: 2,
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Icon(
                  Icons.auto_awesome,
                  color: Theme.of(context).colorScheme.primary,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  'Réponse suggérée par IA',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                ),
                const Spacer(),
                if (_hasBeenEdited)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: Colors.orange.shade200,
                        width: 1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.edit,
                          size: 12,
                          color: Colors.orange.shade700,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          'Modifiée',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Colors.orange.shade700,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),

            // Reply text (editable or read-only)
            if (_isEditing)
              TextField(
                controller: _controller,
                maxLines: null,
                decoration: InputDecoration(
                  hintText: 'Modifiez la réponse...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  filled: true,
                  fillColor: Colors.grey.shade50,
                ),
                style: const TextStyle(fontSize: 14),
              )
            else
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.blue.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: Colors.blue.shade100,
                    width: 1,
                  ),
                ),
                child: Text(
                  _controller.text,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade800,
                    height: 1.5,
                  ),
                ),
              ),

            const SizedBox(height: 16),

            // Action buttons
            Row(
              children: [
                // Edit/Cancel button
                OutlinedButton.icon(
                  onPressed: () {
                    setState(() {
                      if (_isEditing) {
                        // Cancel editing - restore original
                        _controller.text = widget.analysis.generatedReplyText ?? '';
                        _hasBeenEdited = false;
                      }
                      _isEditing = !_isEditing;
                    });
                  },
                  icon: Icon(
                    _isEditing ? Icons.close : Icons.edit,
                    size: 18,
                  ),
                  label: Text(_isEditing ? 'Annuler' : 'Modifier'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: _isEditing ? Colors.grey.shade700 : Colors.blue.shade700,
                  ),
                ),
                const SizedBox(width: 8),

                // Reject button
                if (!_isEditing)
                  OutlinedButton.icon(
                    onPressed: () {
                      widget.onReject?.call();
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Réponse suggérée rejetée'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                    icon: const Icon(Icons.thumb_down_outlined, size: 18),
                    label: const Text('Rejeter'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red.shade700,
                    ),
                  ),

                const Spacer(),

                // Send button
                ElevatedButton.icon(
                  onPressed: _controller.text.trim().isEmpty
                      ? null
                      : () {
                          if (_isEditing) {
                            setState(() => _isEditing = false);
                          }
                          widget.onSend?.call();
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                _hasBeenEdited
                                    ? 'Réponse modifiée envoyée'
                                    : 'Réponse suggérée envoyée',
                              ),
                              duration: const Duration(seconds: 2),
                            ),
                          );
                        },
                  icon: const Icon(Icons.send, size: 18),
                  label: const Text('Envoyer'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ),

            // Info text
            if (!_isEditing) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 14,
                    color: Colors.grey.shade600,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Cette réponse a été générée automatiquement par l\'IA. Vous pouvez la modifier avant de l\'envoyer.',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey.shade600,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
