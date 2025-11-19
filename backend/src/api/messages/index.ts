import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { messageAggregator } from '../../services/message_aggregator';
import { gmailSyncService } from '../../services/sync/gmail_sync';
import { gmailReplyService } from '../../services/sync/gmail_reply';
import { body, query, param, validationResult } from 'express-validator';

/**
 * Messages API Routes
 * Tasks: T024, T025, T026 - Messages API endpoints
 * Reference: specs/001-ai-communication-hub/contracts/messages-api.yaml
 *
 * Endpoints:
 * - GET /api/v1/messages - List messages with filters
 * - GET /api/v1/messages/:id - Get single message
 * - PATCH /api/v1/messages/:id/read - Mark as read/unread
 * - PATCH /api/v1/messages/:id/archive - Archive message
 * - GET /api/v1/messages/:id/thread - Get message thread
 * - GET /api/v1/messages/:id/replies - Generate reply suggestions
 * - POST /api/v1/messages/search - Search messages
 * - POST /api/v1/messages/sync - Trigger manual sync
 * - GET /api/v1/messages/stats - Get message statistics
 */

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/messages
 * List messages with filters and pagination
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('platforms').optional().isString(),
    query('priority').optional().isIn(['high', 'medium', 'low']),
    query('readStatus').optional().isBoolean().toBoolean(),
    query('urgent').optional().isBoolean().toBoolean(),
    query('categoryId').optional().isMongoId(),
    query('sortBy').optional().isIn(['timestamp', 'priorityScore', 'sender']),
    query('sortOrder').optional().isIn(['asc', 'desc'])
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const {
        page,
        limit,
        platforms,
        priority,
        readStatus,
        urgent,
        categoryId,
        sortBy,
        sortOrder
      } = req.query;

      const result = await messageAggregator.getMessages(
        {
          userId,
          platforms: platforms ? (platforms as string).split(',') : undefined,
          priorityLevels: priority ? [priority as any] : undefined,
          readStatus: typeof readStatus === 'string' ? readStatus === 'true' : undefined,
          isUrgent: typeof urgent === 'string' ? urgent === 'true' : undefined,
          categoryId: categoryId as string | undefined,
          archived: false
        },
        {
          page: typeof page === 'string' ? parseInt(page) : undefined,
          limit: typeof limit === 'string' ? parseInt(limit) : undefined,
          sortBy: sortBy as any,
          sortOrder: sortOrder as any
        }
      );

      res.json(result);
    } catch (error: any) {
      console.error('❌ Error listing messages:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to list messages'
      });
    }
  }
);

/**
 * GET /api/v1/messages/unread/count
 * Get unread messages count
 */
router.get('/unread/count', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const count = await messageAggregator.getUnreadCount(userId);

    res.json({ count });
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get unread count'
    });
  }
});

/**
 * GET /api/v1/messages/urgent
 * Get urgent messages
 */
router.get('/urgent', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const messages = await messageAggregator.getUrgentMessages(userId);

    res.json({ messages, count: messages.length });
  } catch (error) {
    console.error('❌ Error getting urgent messages:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get urgent messages'
    });
  }
});

/**
 * GET /api/v1/messages/:id
 * Get single message by ID
 */
router.get(
  '/:id',
  [param('id').isMongoId()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { id } = req.params;

      const message = await messageAggregator.getMessage(id, userId);

      if (!message) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Message not found'
        });
        return;
      }

      res.json(message);
    } catch (error) {
      console.error('❌ Error getting message:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get message'
      });
    }
  }
);

/**
 * PATCH /api/v1/messages/:id/read
 * Mark message as read or unread
 */
router.patch(
  '/:id/read',
  [
    param('id').isMongoId(),
    body('readStatus').isBoolean()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { id } = req.params;
      const { readStatus } = req.body;

      const success = await messageAggregator.updateReadStatus(id, userId, readStatus);

      if (!success) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Message not found'
        });
        return;
      }

      res.json({
        success: true,
        message: `Message marked as ${readStatus ? 'read' : 'unread'}`
      });
    } catch (error) {
      console.error('❌ Error updating read status:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update read status'
      });
    }
  }
);

/**
 * PATCH /api/v1/messages/:id/archive
 * Archive or unarchive message
 */
router.patch(
  '/:id/archive',
  [
    param('id').isMongoId(),
    body('archive').isBoolean()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { id } = req.params;
      const { archive } = req.body;

      const success = await messageAggregator.archiveMessage(id, userId, archive);

      if (!success) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Message not found'
        });
        return;
      }

      res.json({
        success: true,
        message: `Message ${archive ? 'archived' : 'unarchived'}`
      });
    } catch (error) {
      console.error('❌ Error archiving message:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to archive message'
      });
    }
  }
);

/**
 * GET /api/v1/messages/:id/thread
 * Get message thread
 */
router.get(
  '/:id/thread',
  [param('id').isMongoId()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { id } = req.params;

      const thread = await messageAggregator.getThread(id, userId);

      res.json({ messages: thread, count: thread.length });
    } catch (error) {
      console.error('❌ Error getting thread:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get message thread'
      });
    }
  }
);

/**
 * GET /api/v1/messages/:id/replies
 * Generate reply suggestions
 */
router.get(
  '/:id/replies',
  [param('id').isMongoId()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { id } = req.params;

      const replies = await messageAggregator.generateReplies(id, userId);

      res.json({ replies, count: replies.length });
    } catch (error) {
      console.error('❌ Error generating replies:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to generate reply suggestions'
      });
    }
  }
);

/**
 * POST /api/v1/messages/:id/reply/accept
 * Track when user accepts an AI reply suggestion
 * Task: T048 - Track AI reply acceptance for analytics
 */
router.post(
  '/:id/reply/accept',
  [
    param('id').isMongoId(),
    body('selectedReply').isString().notEmpty(),
    body('finalReply').optional().isString()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { id } = req.params;
      const { selectedReply, finalReply } = req.body;

      // Log analytics event
      const { aiAnalyticsService } = await import('../../services/analytics/ai_analytics');
      await aiAnalyticsService.logReplyAccepted({
        userId,
        messageId: id,
        selectedReply,
        finalReply
      });

      res.json({
        success: true,
        message: 'Reply acceptance tracked'
      });
    } catch (error) {
      console.error('❌ Error tracking reply acceptance:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to track reply acceptance'
      });
    }
  }
);

/**
 * POST /api/v1/messages/:id/reply/reject
 * Track when user rejects AI reply suggestions
 * Task: T048 - Track AI reply rejection for analytics
 */
router.post(
  '/:id/reply/reject',
  [param('id').isMongoId()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { id } = req.params;

      // Log analytics event
      const { aiAnalyticsService } = await import('../../services/analytics/ai_analytics');
      await aiAnalyticsService.logReplyRejected({
        userId,
        messageId: id
      });

      res.json({
        success: true,
        message: 'Reply rejection tracked'
      });
    } catch (error) {
      console.error('❌ Error tracking reply rejection:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to track reply rejection'
      });
    }
  }
);

/**
 * POST /api/v1/messages/:id/categorize
 * Categorize message with AI
 */
router.post(
  '/:id/categorize',
  [param('id').isMongoId()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { id } = req.params;

      const category = await messageAggregator.categorizeMessage(id, userId);

      if (!category) {
        res.status(500).json({
          error: 'Categorization Failed',
          message: 'Failed to categorize message'
        });
        return;
      }

      res.json({
        success: true,
        category
      });
    } catch (error) {
      console.error('❌ Error categorizing message:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to categorize message'
      });
    }
  }
);

/**
 * PATCH /api/v1/messages/:id/category
 * Manually assign category to message
 */
router.patch(
  '/:id/category',
  [
    param('id').isMongoId(),
    body('categoryId').optional().isMongoId()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { id } = req.params;
      const { categoryId } = req.body;

      const message = await messageAggregator.updateMessageCategory(id, userId, categoryId);

      if (!message) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Message not found'
        });
        return;
      }

      console.log(`✅ Message category updated: ${id} → ${categoryId || 'none'}`);

      res.json({
        success: true,
        message: 'Category updated successfully',
        categoryId: message.categoryId
      });
    } catch (error) {
      console.error('❌ Error updating message category:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update category'
      });
    }
  }
);

/**
 * POST /api/v1/messages/search
 * Search messages with full-text search
 */
router.post(
  '/search',
  [
    body('query').isString().trim().notEmpty(),
    body('page').optional().isInt({ min: 1 }).toInt(),
    body('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { query, page, limit } = req.body;

      const result = await messageAggregator.searchMessages(
        userId,
        query,
        { page, limit }
      );

      res.json(result);
    } catch (error) {
      console.error('❌ Error searching messages:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to search messages'
      });
    }
  }
);

/**
 * POST /api/v1/messages/sync
 * Trigger manual sync for user's accounts
 */
router.post('/sync', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Trigger sync in background
    gmailSyncService.syncUserAccounts(userId).then(results => {
      console.log(`✅ Sync completed for user ${userId}:`, results);
    }).catch(error => {
      console.error(`❌ Sync failed for user ${userId}:`, error);
    });

    res.json({
      success: true,
      message: 'Sync triggered. This may take a few moments.'
    });
  } catch (error) {
    console.error('❌ Error triggering sync:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to trigger sync'
    });
  }
});

/**
 * POST /api/v1/messages/bulk/read
 * Bulk mark messages as read
 */
router.post(
  '/bulk/read',
  [body('messageIds').isArray().notEmpty()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { messageIds } = req.body;

      const count = await messageAggregator.bulkMarkAsRead(userId, messageIds);

      res.json({
        success: true,
        count,
        message: `${count} messages marked as read`
      });
    } catch (error) {
      console.error('❌ Error bulk marking as read:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to mark messages as read'
      });
    }
  }
);

/**
 * POST /api/v1/messages/bulk/archive
 * Bulk archive messages
 */
router.post(
  '/bulk/archive',
  [body('messageIds').isArray().notEmpty()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { messageIds } = req.body;

      const count = await messageAggregator.bulkArchive(userId, messageIds);

      res.json({
        success: true,
        count,
        message: `${count} messages archived`
      });
    } catch (error) {
      console.error('❌ Error bulk archiving:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to archive messages'
      });
    }
  }
);

/**
 * POST /api/v1/messages/:id/reply
 * Send a reply to a message
 */
router.post(
  '/:id/reply',
  [
    param('id').isMongoId(),
    body('content').isString().trim().notEmpty(),
    body('replyAll').optional().isBoolean()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { id } = req.params;
      const { content, replyAll = false } = req.body;

      // Send the reply
      const result = await gmailReplyService.sendReply({
        messageId: id,
        userId,
        replyContent: content,
        replyAll
      });

      if (!result.success) {
        res.status(500).json({
          error: 'Reply Failed',
          message: result.error || 'Failed to send reply'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Reply sent successfully',
        sentMessageId: result.sentMessageId
      });
    } catch (error) {
      console.error('❌ Error sending reply:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to send reply'
      });
    }
  }
);

export default router;
