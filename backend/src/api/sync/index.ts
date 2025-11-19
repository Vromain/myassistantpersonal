import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { param, query, validationResult } from 'express-validator';
import { syncProgressManager } from '../../services/sync_progress_manager';

/**
 * Sync API Routes
 * Task: T082 - Handle large message imports with progress indicator
 *
 * Endpoints:
 * - GET /api/v1/sync/progress/:syncId - Get sync progress by ID
 * - GET /api/v1/sync/active - Get active syncs for user
 * - GET /api/v1/sync/history - Get recent sync history
 * - POST /api/v1/sync/:syncId/cancel - Cancel an ongoing sync
 */

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/sync/progress/:syncId
 * Get sync progress for a specific sync operation
 */
router.get(
  '/progress/:syncId',
  [param('syncId').isUUID()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { syncId } = req.params;

      const progress = await syncProgressManager.getSyncProgress(syncId);

      if (!progress) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Sync progress not found'
        });
        return;
      }

      res.json({
        success: true,
        progress
      });
    } catch (error) {
      console.error('❌ Error getting sync progress:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get sync progress'
      });
    }
  }
);

/**
 * GET /api/v1/sync/active
 * Get all active syncs for the current user
 */
router.get(
  '/active',
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.userId!;

      const syncs = await syncProgressManager.getActiveSyncs(userId);

      res.json({
        success: true,
        syncs,
        count: syncs.length
      });
    } catch (error) {
      console.error('❌ Error getting active syncs:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get active syncs'
      });
    }
  }
);

/**
 * GET /api/v1/sync/history
 * Get recent sync history for the current user
 */
router.get(
  '/history',
  [query('limit').optional().isInt({ min: 1, max: 50 }).toInt()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const syncs = await syncProgressManager.getRecentSyncs(userId, limit);

      res.json({
        success: true,
        syncs,
        count: syncs.length
      });
    } catch (error) {
      console.error('❌ Error getting sync history:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get sync history'
      });
    }
  }
);

/**
 * POST /api/v1/sync/:syncId/cancel
 * Cancel an ongoing sync operation
 */
router.post(
  '/:syncId/cancel',
  [param('syncId').isUUID()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { syncId } = req.params;
      const userId = req.userId!;

      // Verify sync belongs to user
      const progress = await syncProgressManager.getSyncProgress(syncId);

      if (!progress) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Sync not found'
        });
        return;
      }

      // Check if sync is still active
      if (!['pending', 'syncing'].includes(progress.status)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Sync is not active and cannot be cancelled'
        });
        return;
      }

      // Cancel the sync
      await syncProgressManager.cancelSync(syncId);

      res.json({
        success: true,
        message: 'Sync cancelled successfully',
        syncId
      });
    } catch (error) {
      console.error('❌ Error cancelling sync:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to cancel sync'
      });
    }
  }
);

export default router;
