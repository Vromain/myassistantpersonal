import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { body, param, validationResult } from 'express-validator';
import { offlineQueueManager } from '../../services/offline_queue_manager';
import { OperationType } from '../../models/offline_operation';

/**
 * Offline Queue API Routes
 * Task: T084 - Add offline mode with queued message sync
 *
 * Endpoints:
 * - POST /api/v1/offline/queue - Add operation to queue
 * - GET /api/v1/offline/queue - Get pending operations
 * - POST /api/v1/offline/process - Process all pending operations
 * - POST /api/v1/offline/process/:id - Process specific operation
 * - GET /api/v1/offline/stats - Get queue statistics
 * - POST /api/v1/offline/retry - Retry failed operations
 * - DELETE /api/v1/offline/completed - Clear completed operations
 */

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/offline/queue
 * Add operation to offline queue
 */
router.post(
  '/queue',
  [
    body('operationType').isIn([
      'mark_read',
      'mark_unread',
      'archive',
      'unarchive',
      'categorize',
      'send_reply',
      'delete'
    ]),
    body('resourceType').isIn(['message', 'category', 'account']),
    body('data').isObject(),
    body('priority').optional().isInt({ min: 1, max: 10 }),
    body('clientId').optional().isString(),
    body('clientTimestamp').optional().isISO8601()
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
        operationType,
        resourceType,
        resourceId,
        data,
        priority,
        clientId,
        clientTimestamp
      } = req.body;

      const operation = await offlineQueueManager.enqueue({
        userId,
        operationType: operationType as OperationType,
        resourceType,
        resourceId,
        data,
        priority,
        clientId,
        clientTimestamp: clientTimestamp ? new Date(clientTimestamp) : undefined
      });

      res.status(201).json({
        success: true,
        message: 'Operation queued successfully',
        operation: {
          id: operation._id,
          operationType: operation.operationType,
          status: operation.status,
          createdAt: operation.createdAt
        }
      });
    } catch (error: any) {
      console.error('❌ Error queueing operation:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to queue operation'
      });
    }
  }
);

/**
 * GET /api/v1/offline/queue
 * Get pending operations for current user
 */
router.get('/queue', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const operations = await offlineQueueManager.getPendingOperations(userId);

    res.json({
      success: true,
      operations,
      count: operations.length
    });
  } catch (error) {
    console.error('❌ Error getting queue:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get pending operations'
    });
  }
});

/**
 * POST /api/v1/offline/process
 * Process all pending operations for current user
 */
router.post('/process', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const result = await offlineQueueManager.processUserQueue(userId);

    res.json({
      success: true,
      message: 'Queue processed',
      result
    });
  } catch (error) {
    console.error('❌ Error processing queue:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process queue'
    });
  }
});

/**
 * POST /api/v1/offline/process/:id
 * Process a specific operation
 */
router.post(
  '/process/:id',
  [param('id').isMongoId()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;

      const success = await offlineQueueManager.processOperation(id);

      if (success) {
        res.json({
          success: true,
          message: 'Operation processed successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Operation processing failed'
        });
      }
    } catch (error) {
      console.error('❌ Error processing operation:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process operation'
      });
    }
  }
);

/**
 * GET /api/v1/offline/stats
 * Get queue statistics for current user
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const stats = await offlineQueueManager.getQueueStats(userId);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('❌ Error getting stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get queue statistics'
    });
  }
});

/**
 * POST /api/v1/offline/retry
 * Retry all failed operations
 */
router.post('/retry', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const count = await offlineQueueManager.retryFailed(userId);

    res.json({
      success: true,
      message: `${count} failed operations queued for retry`,
      count
    });
  } catch (error) {
    console.error('❌ Error retrying operations:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retry operations'
    });
  }
});

/**
 * DELETE /api/v1/offline/completed
 * Clear completed operations
 */
router.delete('/completed', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const count = await offlineQueueManager.clearCompleted(userId);

    res.json({
      success: true,
      message: `${count} completed operations cleared`,
      count
    });
  } catch (error) {
    console.error('❌ Error clearing completed operations:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to clear completed operations'
    });
  }
});

/**
 * GET /api/v1/offline/health
 * Check if backend is online (for offline detection)
 */
router.get('/health', (req: AuthRequest, res: Response) => {
  res.json({
    online: true,
    timestamp: new Date(),
    server: 'healthy'
  });
});

export default router;
