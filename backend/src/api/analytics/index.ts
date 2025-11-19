import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { query, validationResult } from 'express-validator';
import { aiAnalyticsService } from '../../services/analytics/ai_analytics';
import { analyticsAggregator } from '../../services/analytics/analytics_aggregator';

/**
 * Analytics API Routes
 * Task: T048 - AI reply acceptance rate analytics
 * Task: T060 - AI categorization accuracy analytics
 * Task: T071 - GET /analytics/summary endpoint
 * Task: T072 - GET /analytics/response-times endpoint
 * Task: T073 - GET /analytics/platform-breakdown endpoint
 * Task: T074 - GET /analytics/top-contacts endpoint
 *
 * Endpoints:
 * - GET /api/v1/analytics/ai - Get all AI analytics
 * - GET /api/v1/analytics/ai/replies - Get reply acceptance analytics
 * - GET /api/v1/analytics/ai/categorization - Get categorization accuracy
 * - GET /api/v1/analytics/ai/priority - Get priority scoring analytics
 * - GET /api/v1/analytics/summary - Get analytics summary
 * - GET /api/v1/analytics/response-times - Get response time metrics
 * - GET /api/v1/analytics/platform-breakdown - Get platform distribution
 * - GET /api/v1/analytics/top-contacts - Get top contacts
 */

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/analytics/ai
 * Get comprehensive AI analytics summary
 */
router.get(
  '/ai',
  [
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { startDate, endDate } = req.query;

      const analytics = await aiAnalyticsService.getAISummary(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        period: {
          start: startDate || null,
          end: endDate || null
        },
        analytics
      });
    } catch (error) {
      console.error('❌ Error getting AI analytics:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve AI analytics'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/ai/replies
 * Get AI reply acceptance rate analytics
 * Success Criteria: SC-002 (40% acceptance rate target)
 */
router.get(
  '/ai/replies',
  [
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { startDate, endDate } = req.query;

      const analytics = await aiAnalyticsService.getReplyAnalytics(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      // Check if meeting success criteria
      const targetAcceptanceRate = 0.40; // SC-002: 40% target
      const meetsTarget = analytics.acceptanceRate >= targetAcceptanceRate;

      res.json({
        success: true,
        period: {
          start: startDate || null,
          end: endDate || null
        },
        analytics,
        successCriteria: {
          target: targetAcceptanceRate,
          current: analytics.acceptanceRate,
          meetsTarget,
          percentOfTarget: (analytics.acceptanceRate / targetAcceptanceRate) * 100
        }
      });
    } catch (error) {
      console.error('❌ Error getting reply analytics:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve reply analytics'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/ai/categorization
 * Get AI categorization accuracy analytics
 * Success Criteria: SC-003 (80% accuracy target)
 */
router.get(
  '/ai/categorization',
  [
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { startDate, endDate } = req.query;

      const analytics = await aiAnalyticsService.getCategorizationAnalytics(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      // Check if meeting success criteria
      const targetAccuracy = 0.80; // SC-003: 80% target
      const meetsTarget = analytics.accuracy >= targetAccuracy;

      res.json({
        success: true,
        period: {
          start: startDate || null,
          end: endDate || null
        },
        analytics,
        successCriteria: {
          target: targetAccuracy,
          current: analytics.accuracy,
          meetsTarget,
          percentOfTarget: (analytics.accuracy / targetAccuracy) * 100
        }
      });
    } catch (error) {
      console.error('❌ Error getting categorization analytics:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve categorization analytics'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/ai/priority
 * Get AI priority scoring analytics
 */
router.get(
  '/ai/priority',
  [
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { startDate, endDate } = req.query;

      const analytics = await aiAnalyticsService.getPriorityAnalytics(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        period: {
          start: startDate || null,
          end: endDate || null
        },
        analytics
      });
    } catch (error) {
      console.error('❌ Error getting priority analytics:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve priority analytics'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/summary
 * Get analytics summary for period
 * Task: T071
 */
router.get(
  '/summary',
  [
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { startDate, endDate } = req.query;

      // Default to last 30 days if not specified
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate
        ? new Date(startDate as string)
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      const summary = await analyticsAggregator.getSummary(userId, start, end);

      res.json({
        success: true,
        period: {
          start,
          end
        },
        summary
      });
    } catch (error) {
      console.error('❌ Error getting analytics summary:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve analytics summary'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/response-times
 * Get response time metrics
 * Task: T072
 */
router.get(
  '/response-times',
  [
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { startDate, endDate } = req.query;

      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate
        ? new Date(startDate as string)
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      const metrics = await analyticsAggregator.getResponseTimes(userId, start, end);

      res.json({
        success: true,
        period: {
          start,
          end
        },
        metrics
      });
    } catch (error) {
      console.error('❌ Error getting response times:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve response times'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/platform-breakdown
 * Get platform distribution
 * Task: T073
 */
router.get(
  '/platform-breakdown',
  [
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { startDate, endDate } = req.query;

      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate
        ? new Date(startDate as string)
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      const breakdown = await analyticsAggregator.getPlatformBreakdown(userId, start, end);

      res.json({
        success: true,
        period: {
          start,
          end
        },
        breakdown
      });
    } catch (error) {
      console.error('❌ Error getting platform breakdown:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve platform breakdown'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/top-contacts
 * Get top contacts
 * Task: T074
 */
router.get(
  '/top-contacts',
  [
    query('startDate').optional().isISO8601().toDate(),
    query('endDate').optional().isISO8601().toDate(),
    query('limit').optional().isInt({ min: 1, max: 50 })
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.userId!;
      const { startDate, endDate, limit } = req.query;

      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate
        ? new Date(startDate as string)
        : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      const limitNum = limit ? parseInt(limit as string) : 10;

      const contacts = await analyticsAggregator.getTopContacts(userId, start, end, limitNum);

      res.json({
        success: true,
        period: {
          start,
          end
        },
        contacts
      });
    } catch (error) {
      console.error('❌ Error getting top contacts:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve top contacts'
      });
    }
  }
);

export default router;
