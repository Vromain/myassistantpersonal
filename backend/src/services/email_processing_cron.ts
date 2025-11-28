import cron, { ScheduledTask } from 'node-cron';
import { User } from '../models/user';
import { db } from '../db/connection';
import { ConnectedAccount } from '../models/connected_account';
import { Message, IMessage } from '../models/message';
import { MessageAnalysis } from '../models/message_analysis';
import { UserSettings } from '../models/user_settings';
// Gmail sync service integration removed - sync handled by existing sync scheduler
import { aiAnalysisService } from './ai_analysis_service';
import { autoReplyService } from './auto_reply_service';
import { autoDeleteService } from './auto_delete_service';
import mongoose from 'mongoose';

/**
 * Email Processing Cron Job Service
 *
 * Workflow:
 * 1. Fetch new emails for all users
 * 2. Analyze emails with AI (spam detection + reply need)
 * 3. Generate auto-replies if needed and enabled
 * 4. Auto-delete spam if enabled
 * 5. Track all actions for dashboard
 */

export interface ProcessingStats {
  usersProcessed: number;
  emailsFetched: number;
  emailsAnalyzed: number;
  spamDetected: number;
  spamDeleted: number;
  repliesGenerated: number;
  repliesSent: number;
  errors: string[];
}

export class EmailProcessingCronService {
  private cronJob: ScheduledTask | null = null;
  private isProcessing = false;

  /**
   * Start the cron job
   * Runs every 15 minutes by default
   */
  start(cronExpression: string = '*/15 * * * *'): void {
    if (this.cronJob) {
      console.log('⚠️  Cron: Email processing job already running');
      return;
    }

    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.processAllUsers();
    });

    console.log(`✅ Cron: Email processing started (${cronExpression})`);
  }

  /**
   * Stop the cron job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('⏹️  Cron: Email processing stopped');
    }
  }

  /**
   * Process all users manually (for testing or manual trigger)
   */
  async processAllUsers(): Promise<ProcessingStats> {
    if (this.isProcessing) {
      console.log('⏳ Cron: Already processing, skipping this run');
      return {
        usersProcessed: 0,
        emailsFetched: 0,
        emailsAnalyzed: 0,
        spamDetected: 0,
        spamDeleted: 0,
        repliesGenerated: 0,
        repliesSent: 0,
        errors: ['Processing already in progress']
      };
    }

    this.isProcessing = true;
    const stats: ProcessingStats = {
      usersProcessed: 0,
      emailsFetched: 0,
      emailsAnalyzed: 0,
      spamDetected: 0,
      spamDeleted: 0,
      repliesGenerated: 0,
      repliesSent: 0,
      errors: []
    };

    try {
      console.log('🔄 Cron: Starting email processing for all users...');

      // Get all active users
      const ds = db.getConnection();
      const users = await ds!.getRepository(User).find();
      console.log(`👥 Cron: Found ${users.length} active users`);

      for (const user of users) {
        try {
          const userStats = await this.processUser((user as any).id);

          // Aggregate stats
          stats.usersProcessed++;
          stats.emailsFetched += userStats.emailsFetched;
          stats.emailsAnalyzed += userStats.emailsAnalyzed;
          stats.spamDetected += userStats.spamDetected;
          stats.spamDeleted += userStats.spamDeleted;
          stats.repliesGenerated += userStats.repliesGenerated;
          stats.repliesSent += userStats.repliesSent;

          if (userStats.errors.length > 0) {
            stats.errors.push(...userStats.errors);
          }
        } catch (error: any) {
          console.error(`❌ Cron: Error processing user ${(user as any).id}:`, error);
          stats.errors.push(`User ${(user as any).id}: ${error.message}`);
        }
      }

      console.log('✅ Cron: Email processing completed');
      console.log(`📊 Stats: ${JSON.stringify(stats, null, 2)}`);
    } catch (error: any) {
      console.error('❌ Cron: Fatal error during processing:', error);
      stats.errors.push(`Fatal: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }

    return stats;
  }

  /**
   * Process a single user
   */
  private async processUser(userId: string): Promise<ProcessingStats> {
    const stats: ProcessingStats = {
      usersProcessed: 0,
      emailsFetched: 0,
      emailsAnalyzed: 0,
      spamDetected: 0,
      spamDeleted: 0,
      repliesGenerated: 0,
      repliesSent: 0,
      errors: []
    };

    console.log(`📧 Cron: Processing user ${userId}`);

    // Get user settings
    const settings = await UserSettings.findOne({
      userId: userId
    });

    if (!settings) {
      stats.errors.push('User settings not found');
      return stats;
    }

    // Get connected accounts
    const accounts = await ConnectedAccount.find({
      userId: userId,
      isActive: true
    });

    if (accounts.length === 0) {
      console.log(`⏭️  Cron: No active accounts for user ${userId}`);
      return stats;
    }

    // 1. Fetch new emails - SKIPPED: sync handled by existing sync scheduler
    // Email fetching is handled by the sync scheduler that runs every 5 minutes
    // This cron job focuses on analyzing already-synced messages
    console.log(`⏭️  Cron: Skipping email fetch (handled by sync scheduler)`);

    // 2. Get unanalyzed messages
    const unanalyzedMessages = await this.getUnanalyzedMessages(userId);
    console.log(`🔍 Cron: Found ${unanalyzedMessages.length} unanalyzed messages`);

    // 3. Analyze messages with AI
    for (const message of unanalyzedMessages) {
      try {
        const analysis = await aiAnalysisService.analyzeMessage(message);
        stats.emailsAnalyzed++;

        if (analysis.isSpam) {
          stats.spamDetected++;
        }

        // 4. Generate auto-reply if needed
        if (
          settings.autoSendRepliesEnabled &&
          analysis.needsResponse &&
          analysis.responseConfidence >= settings.responseConfidenceThreshold
        ) {
          try {
            const replyResult = await autoReplyService.generateAndSendReply(
              message._id.toString(),
              userId
            );

            if (replyResult.generated) {
              stats.repliesGenerated++;
            }

            if (replyResult.sent) {
              stats.repliesSent++;
            }
          } catch (error: any) {
            console.error(`❌ Cron: Error generating reply:`, error);
            stats.errors.push(`Reply error: ${error.message}`);
          }
        }
      } catch (error: any) {
        console.error(`❌ Cron: Error analyzing message ${message._id}:`, error);
        stats.errors.push(`Message ${message._id}: ${error.message}`);
      }
    }

    // 5. Auto-delete spam if enabled
    if (settings.autoDeleteSpamEnabled) {
      try {
        const deleteResult = await autoDeleteService.processAutoDelete(userId);
        stats.spamDeleted += deleteResult.messagesDeleted;

        if (deleteResult.errors.length > 0) {
          stats.errors.push(...deleteResult.errors);
        }
      } catch (error: any) {
        console.error(`❌ Cron: Error auto-deleting spam:`, error);
        stats.errors.push(`Auto-delete error: ${error.message}`);
      }
    }

    return stats;
  }

  /**
   * Get messages that haven't been analyzed yet
   */
  private async getUnanalyzedMessages(userId: string): Promise<IMessage[]> {
    // Find messages without analysis
    const messages = await Message.find({
      userId: userId
    }).lean();

    const messageIds = messages.map(m => m._id);
    const analyses = await MessageAnalysis.find({
      messageId: { $in: messageIds }
    }).lean();

    const analyzedIds = new Set(analyses.map(a => a.messageId.toString()));

    return messages.filter(m => !analyzedIds.has(m._id.toString())) as unknown as IMessage[];
  }

  /**
   * Get current processing status
   */
  getStatus(): { isRunning: boolean; isProcessing: boolean } {
    return {
      isRunning: this.cronJob !== null,
      isProcessing: this.isProcessing
    };
  }
}

export const emailProcessingCron = new EmailProcessingCronService();
