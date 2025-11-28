import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { body, validationResult } from 'express-validator';
import { UserSettings } from '../../models/user_settings';
import mongoose from 'mongoose';

/**
 * Settings API Routes
 * Tasks: T053, T054, T055 - Settings API endpoints
 * Reference: specs/002-intelligent-message-analysis/spec.md FR-008, FR-009
 *
 * Endpoints:
 * - GET /api/v1/settings - Get user settings
 * - PUT /api/v1/settings - Update user settings
 */

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/settings
 * Get current user settings (creates default if doesn't exist)
 * Task: T053
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Find or create user settings
    let settings = await UserSettings.findOne({ userId });

    if (!settings) {
      // Create default settings for new user
      settings = new UserSettings({
        userId,
        autoDeleteSpamEnabled: false,
        autoSendRepliesEnabled: false,
        spamThreshold: 80,
        responseConfidenceThreshold: 85,
        autoReplyConditions: {
          senderWhitelist: [],
          senderBlacklist: [],
          businessHoursOnly: false,
          maxRepliesPerDay: 10
        }
      });
      await settings.save();
      console.log(`✅ Created default settings for user ${userId}`);
    }

    res.json({
      userId: settings.userId,
      autoDeleteSpamEnabled: settings.autoDeleteSpamEnabled,
      autoSendRepliesEnabled: settings.autoSendRepliesEnabled,
      spamThreshold: settings.spamThreshold,
      responseConfidenceThreshold: settings.responseConfidenceThreshold,
      senderWhitelist: settings.autoReplyConditions.senderWhitelist,
      senderBlacklist: settings.autoReplyConditions.senderBlacklist,
      businessHoursOnly: settings.autoReplyConditions.businessHoursOnly,
      maxRepliesPerDay: settings.autoReplyConditions.maxRepliesPerDay,
      dailySummaryEnabled: true, // TODO: Add to model when implementing daily summary
      lastUpdated: settings.lastUpdated,
      createdAt: settings.createdAt
    });
  } catch (error: any) {
    console.error('❌ Error getting settings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user settings'
    });
  }
});

/**
 * PUT /api/v1/settings
 * Update user settings
 * Task: T054
 */
router.put(
  '/',
  [
    body('autoDeleteSpamEnabled').optional().isBoolean(),
    body('autoSendRepliesEnabled').optional().isBoolean(),
    body('spamThreshold').optional().isInt({ min: 0, max: 100 }),
    body('responseConfidenceThreshold').optional().isInt({ min: 0, max: 100 }),
    body('senderWhitelist').optional().isArray(),
    body('senderWhitelist.*').optional().isEmail(),
    body('senderBlacklist').optional().isArray(),
    body('senderBlacklist.*').optional().isEmail(),
    body('businessHoursOnly').optional().isBoolean(),
    body('maxRepliesPerDay').optional().isInt({ min: 1, max: 100 }),
    body('dailySummaryEnabled').optional().isBoolean()
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
        autoDeleteSpamEnabled,
        autoSendRepliesEnabled,
        spamThreshold,
        responseConfidenceThreshold,
        senderWhitelist,
        senderBlacklist,
        businessHoursOnly,
        maxRepliesPerDay,
        dailySummaryEnabled
      } = req.body;

      // Find or create settings
      let settings = await UserSettings.findOne({ userId });

      if (!settings) {
        // Create new settings
        settings = new UserSettings({
          userId,
          autoDeleteSpamEnabled: autoDeleteSpamEnabled ?? false,
          autoSendRepliesEnabled: autoSendRepliesEnabled ?? false,
          spamThreshold: spamThreshold ?? 80,
          responseConfidenceThreshold: responseConfidenceThreshold ?? 85,
          autoReplyConditions: {
            senderWhitelist: senderWhitelist ?? [],
            senderBlacklist: senderBlacklist ?? [],
            businessHoursOnly: businessHoursOnly ?? false,
            maxRepliesPerDay: maxRepliesPerDay ?? 10
          }
        });
      } else {
        // Update existing settings
        if (autoDeleteSpamEnabled !== undefined) {
          settings.autoDeleteSpamEnabled = autoDeleteSpamEnabled;
        }
        if (autoSendRepliesEnabled !== undefined) {
          settings.autoSendRepliesEnabled = autoSendRepliesEnabled;
        }
        if (spamThreshold !== undefined) {
          settings.spamThreshold = spamThreshold;
        }
        if (responseConfidenceThreshold !== undefined) {
          settings.responseConfidenceThreshold = responseConfidenceThreshold;
        }
        if (senderWhitelist !== undefined) {
          settings.autoReplyConditions.senderWhitelist = senderWhitelist;
        }
        if (senderBlacklist !== undefined) {
          settings.autoReplyConditions.senderBlacklist = senderBlacklist;
        }
        if (businessHoursOnly !== undefined) {
          settings.autoReplyConditions.businessHoursOnly = businessHoursOnly;
        }
        if (maxRepliesPerDay !== undefined) {
          settings.autoReplyConditions.maxRepliesPerDay = maxRepliesPerDay;
        }
        // TODO: Handle dailySummaryEnabled when added to model
      }

      await settings.save();
      console.log(`✅ Updated settings for user ${userId}`);

      res.json({
        success: true,
        message: 'Settings updated successfully',
        settings: {
          userId: settings.userId.toString(),
          autoDeleteSpamEnabled: settings.autoDeleteSpamEnabled,
          autoSendRepliesEnabled: settings.autoSendRepliesEnabled,
          spamThreshold: settings.spamThreshold,
          responseConfidenceThreshold: settings.responseConfidenceThreshold,
          senderWhitelist: settings.autoReplyConditions.senderWhitelist,
          senderBlacklist: settings.autoReplyConditions.senderBlacklist,
          businessHoursOnly: settings.autoReplyConditions.businessHoursOnly,
          maxRepliesPerDay: settings.autoReplyConditions.maxRepliesPerDay,
          dailySummaryEnabled: true, // TODO: Add to model
          lastUpdated: settings.lastUpdated,
          createdAt: settings.createdAt
        }
      });
    } catch (error: any) {
      console.error('❌ Error updating settings:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update user settings'
      });
    }
  }
);

export default router;
