import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { autoDeleteService } from '../../services/auto_delete_service';

/**
 * Auto-Delete API Routes
 * Tasks: T066-T067 - Auto-delete API endpoints
 * Reference: specs/002-intelligent-message-analysis/spec.md FR-008
 *
 * Endpoints:
 * - POST /api/v1/auto-delete/process - Manually trigger auto-delete process
 * - POST /api/v1/auto-delete/restore/:messageId - Restore message from trash
 * - GET /api/v1/auto-delete/logs - Get auto-delete history
 */

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/auto-delete/process
 * Manually trigger auto-delete spam processing
 * Task: T066
 */
router.post('/process', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    console.log(`🗑️  AutoDelete API: Processing for user ${userId}`);

    const result = await autoDeleteService.processAutoDelete(userId);

    res.json({
      success: result.success,
      messagesProcessed: result.messagesProcessed,
      messagesDeleted: result.messagesDeleted,
      deletedMessageIds: result.deletedMessageIds,
      errors: result.errors
    });
  } catch (error: any) {
    console.error('❌ AutoDelete API: Error processing auto-delete:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process auto-delete'
    });
  }
});

/**
 * POST /api/v1/auto-delete/restore/:messageId
 * Restore a message from trash
 * Task: T067
 */
router.post('/restore/:messageId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { messageId } = req.params;

    console.log(`♻️  AutoDelete API: Restoring message ${messageId}`);

    const success = await autoDeleteService.restoreFromTrash(messageId, userId);

    if (success) {
      res.json({
        success: true,
        message: 'Message restored successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to restore message',
        message: 'Message not found or could not be restored'
      });
    }
  } catch (error: any) {
    console.error('❌ AutoDelete API: Error restoring message:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to restore message'
    });
  }
});

/**
 * GET /api/v1/auto-delete/logs
 * Get auto-delete history for the user
 * Task: T067
 */
router.get('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    console.log(`📜 AutoDelete API: Getting logs for user ${userId}`);

    const logs = await autoDeleteService.getAutoDeleteLogs(userId, limit);

    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error: any) {
    console.error('❌ AutoDelete API: Error getting logs:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get auto-delete logs'
    });
  }
});

export default router;
