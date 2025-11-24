import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { Message } from '../../models/message';
import { MessageAnalysis } from '../../models/message_analysis';
import { autoDeleteService } from '../../services/auto_delete_service';
import { autoReplyService } from '../../services/auto_reply_service';
import { emailProcessingCron } from '../../services/email_processing_cron';
import mongoose from 'mongoose';

/**
 * Dashboard API Routes
 *
 * Endpoints:
 * - GET /api/v1/dashboard/stats - Get overall dashboard statistics
 * - GET /api/v1/dashboard/spam - Get spam messages (deleted and pending)
 * - GET /api/v1/dashboard/replies - Get auto-replies (sent and generated)
 * - POST /api/v1/dashboard/process - Manually trigger email processing
 */

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/dashboard/stats
 * Get overall dashboard statistics
 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    console.log(`📊 Dashboard: Getting stats for user ${userId}`);

    // Get message counts
    const totalMessages = await Message.countDocuments({
      userId: new mongoose.Types.ObjectId(userId)
    });

    const trashedMessages = await Message.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      isTrashed: true
    });

    const autoDeletedMessages = await Message.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      autoDeleted: true
    });

    // Get analysis stats
    const messages = await Message.find({
      userId: new mongoose.Types.ObjectId(userId)
    }).lean();

    const messageIds = messages.map(m => m._id);

    const spamAnalyses = await MessageAnalysis.countDocuments({
      messageId: { $in: messageIds },
      isSpam: true
    });

    const repliesGenerated = await MessageAnalysis.countDocuments({
      messageId: { $in: messageIds },
      generatedReplyText: { $exists: true, $ne: null }
    });

    const needsResponse = await MessageAnalysis.countDocuments({
      messageId: { $in: messageIds },
      needsResponse: true
    });

    // Get processing status
    const cronStatus = emailProcessingCron.getStatus();

    res.json({
      success: true,
      stats: {
        totalMessages,
        trashedMessages,
        autoDeletedMessages,
        spamDetected: spamAnalyses,
        repliesGenerated,
        needsResponse,
        processingStatus: {
          cronRunning: cronStatus.isRunning,
          currentlyProcessing: cronStatus.isProcessing
        }
      }
    });
  } catch (error: any) {
    console.error('❌ Dashboard: Error getting stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get dashboard stats'
    });
  }
});

/**
 * GET /api/v1/dashboard/spam
 * Get spam messages (deleted and pending)
 */
router.get('/spam', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const status = req.query.status as string; // 'deleted', 'pending', or 'all'

    console.log(`🗑️  Dashboard: Getting spam for user ${userId}`);

    // Build query
    const query: any = {
      userId: new mongoose.Types.ObjectId(userId)
    };

    if (status === 'deleted') {
      query.isTrashed = true;
      query.autoDeleted = true;
    } else if (status === 'pending') {
      query.isTrashed = false;
    }

    // Get messages
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Get analyses
    const messageIds = messages.map(m => m._id);
    const analyses = await MessageAnalysis.find({
      messageId: { $in: messageIds },
      isSpam: true
    }).lean();

    const analysisMap = new Map(
      analyses.map(a => [a.messageId.toString(), a])
    );

    // Build response
    const spamMessages = messages
      .filter(m => analysisMap.has(m._id.toString()))
      .map(message => {
        const analysis = analysisMap.get(message._id.toString())!;
        return {
          id: message._id.toString(),
          from: message.sender,
          subject: message.subject || 'No subject',
          timestamp: message.timestamp,
          spamProbability: analysis.spamProbability,
          status: message.isTrashed
            ? (message.autoDeleted ? 'auto-deleted' : 'deleted')
            : 'pending',
          trashedAt: message.trashedAt,
          preview: message.content.substring(0, 100)
        };
      });

    res.json({
      success: true,
      count: spamMessages.length,
      spam: spamMessages
    });
  } catch (error: any) {
    console.error('❌ Dashboard: Error getting spam:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get spam messages'
    });
  }
});

/**
 * GET /api/v1/dashboard/replies
 * Get auto-replies (sent and generated)
 */
router.get('/replies', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    console.log(`💬 Dashboard: Getting replies for user ${userId}`);

    const replies = await autoReplyService.getAutoReplyLogs(userId, limit);

    res.json({
      success: true,
      count: replies.length,
      replies
    });
  } catch (error: any) {
    console.error('❌ Dashboard: Error getting replies:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get auto-replies'
    });
  }
});

/**
 * POST /api/v1/dashboard/process
 * Manually trigger email processing
 */
router.post('/process', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    console.log(`🔄 Dashboard: Manual processing triggered for user ${userId}`);

    // Note: Currently processes all users, could be modified to process single user
    const stats = await emailProcessingCron.processAllUsers();

    res.json({
      success: true,
      message: 'Email processing completed',
      stats
    });
  } catch (error: any) {
    console.error('❌ Dashboard: Error processing emails:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process emails'
    });
  }
});

export default router;
