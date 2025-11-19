import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { body, validationResult } from 'express-validator';
import { User } from '../../models/user';
import { apnsClient } from '../../services/notifications/apns_client';

/**
 * Notification Preferences API Routes
 * Task: T061 - Implement notification preferences endpoint (GET, PUT)
 * Task: T063 - APNs integration with device registration
 *
 * Endpoints:
 * - GET /api/v1/notifications/preferences - Get user's notification preferences
 * - PUT /api/v1/notifications/preferences - Update notification preferences
 * - POST /api/v1/notifications/register - Register device token
 * - POST /api/v1/notifications/unregister - Unregister device token
 */

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/notifications/preferences
 * Get current user's notification preferences
 */
router.get('/preferences', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        error: 'User Not Found',
        message: 'User does not exist'
      });
      return;
    }

    res.json({
      success: true,
      preferences: user.preferences
    });
  } catch (error) {
    console.error('❌ Error getting notification preferences:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get notification preferences'
    });
  }
});

/**
 * PUT /api/v1/notifications/preferences
 * Update notification preferences
 */
router.put(
  '/preferences',
  [
    body('quietHours').optional().isObject(),
    body('quietHours.enabled').optional().isBoolean(),
    body('quietHours.startTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('quietHours.endTime').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('quietHours.timezone').optional().isString(),
    body('notificationRules').optional().isArray(),
    body('notificationRules.*.priorityThreshold').optional().isIn(['high', 'medium', 'low']),
    body('notificationRules.*.enabled').optional().isBoolean(),
    body('notificationRules.*.keywords').optional().isArray(),
    body('dataRetentionDays').optional().isIn([30, 90, 180, 365])
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { quietHours, notificationRules, dataRetentionDays } = req.body;

      const user = await User.findById(userId);

      if (!user) {
        res.status(404).json({
          error: 'User Not Found',
          message: 'User does not exist'
        });
        return;
      }

      // Update preferences
      if (quietHours !== undefined) {
        user.preferences.quietHours = {
          ...user.preferences.quietHours,
          ...quietHours
        };
      }

      if (notificationRules !== undefined) {
        user.preferences.notificationRules = notificationRules;
      }

      if (dataRetentionDays !== undefined) {
        user.preferences.dataRetentionDays = dataRetentionDays;
      }

      await user.save();

      console.log(`✅ Updated notification preferences for user ${userId}`);

      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
        preferences: user.preferences
      });
    } catch (error: any) {
      console.error('❌ Error updating notification preferences:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update notification preferences'
      });
    }
  }
);

/**
 * POST /api/v1/notifications/register
 * Register device token for push notifications
 */
router.post(
  '/register',
  [
    body('token').isString().notEmpty(),
    body('deviceId').isString().notEmpty()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { token, deviceId } = req.body;

      await apnsClient.registerToken(userId, token, deviceId);

      res.json({
        success: true,
        message: 'Device registered successfully'
      });
    } catch (error: any) {
      console.error('❌ Error registering device:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to register device'
      });
    }
  }
);

/**
 * POST /api/v1/notifications/unregister
 * Unregister device token
 */
router.post(
  '/unregister',
  [body('deviceId').isString().notEmpty()],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { deviceId } = req.body;

      await apnsClient.unregisterToken(userId, deviceId);

      res.json({
        success: true,
        message: 'Device unregistered successfully'
      });
    } catch (error: any) {
      console.error('❌ Error unregistering device:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to unregister device'
      });
    }
  }
);

export default router;
