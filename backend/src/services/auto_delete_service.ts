import { google } from 'googleapis';
import { Message, IMessage } from '../models/message';
import { MessageAnalysis } from '../models/message_analysis';
import { ConnectedAccount } from '../models/connected_account';
import { UserSettings } from '../models/user_settings';
import { getGmailAccessToken } from './auth/gmail_strategy';
import mongoose from 'mongoose';

/**
 * Auto-Delete Spam Service
 * Tasks: T060-T063 - Auto-delete spam implementation
 * Reference: specs/002-intelligent-message-analysis/spec.md FR-008
 *
 * Automatically moves spam messages to trash based on user settings
 * Respects user-defined spam threshold and logs all actions
 */

export interface AutoDeleteResult {
  success: boolean;
  messagesProcessed: number;
  messagesDeleted: number;
  errors: string[];
  deletedMessageIds: string[];
}

export interface AutoDeleteLogEntry {
  messageId: string;
  subject: string;
  from: string;
  spamProbability: number;
  deletedAt: Date;
  reason: string;
}

export class AutoDeleteService {
  /**
   * Task: T060 - Process spam messages for auto-deletion
   *
   * Checks all analyzed messages for a user and deletes those marked as spam
   * based on the user's spam threshold setting
   */
  async processAutoDelete(userId: string): Promise<AutoDeleteResult> {
    const result: AutoDeleteResult = {
      success: false,
      messagesProcessed: 0,
      messagesDeleted: 0,
      errors: [],
      deletedMessageIds: []
    };

    try {
      console.log(`🗑️  AutoDelete: Processing for user ${userId}`);

      // Get user settings
      const settings = await UserSettings.findOne({
        userId: userId
      });

      if (!settings) {
        result.errors.push('User settings not found');
        return result;
      }

      // Check if auto-delete is enabled
      if (!settings.autoDeleteSpamEnabled) {
        console.log(`⏸️  AutoDelete: Auto-delete disabled for user ${userId}`);
        result.success = true;
        return result;
      }

      console.log(`🎯 AutoDelete: Threshold set to ${settings.spamThreshold}%`);

      // Find messages that are marked as spam and not yet trashed
      const spamMessages = await Message.find({
        userId: userId,
        isTrashed: false
      }).lean();

      result.messagesProcessed = spamMessages.length;

      if (spamMessages.length === 0) {
        console.log(`✅ AutoDelete: No messages to process`);
        result.success = true;
        return result;
      }

      // Get message analyses for these messages
      const messageIds = spamMessages.map(m => m._id);
      const analyses = await MessageAnalysis.find({
        messageId: { $in: messageIds },
        spamProbability: { $gte: settings.spamThreshold }
      }).lean();

      console.log(`📊 AutoDelete: Found ${analyses.length} messages above spam threshold`);

      // Process each spam message
      for (const analysis of analyses) {
        try {
          const message = spamMessages.find(
            m => m._id.toString() === analysis.messageId.toString()
          );

          if (!message) continue;

          // Move to trash via Gmail API (T061)
          const deleted = await this.moveToTrash(
            message.userId.toString(),
            message.accountId.toString(),
            message.externalId
          );

          if (deleted) {
            // Update message status in database (T062)
            await Message.findByIdAndUpdate(message._id, {
              isTrashed: true,
              trashedAt: new Date(),
              autoDeleted: true
            });

            result.messagesDeleted++;
            result.deletedMessageIds.push(message._id.toString());

            console.log(
              `🗑️  AutoDelete: Trashed message "${message.subject}" ` +
              `(spam: ${analysis.spamProbability}%)`
            );
          }
        } catch (error: any) {
          console.error(`❌ AutoDelete: Error processing message:`, error);
          result.errors.push(`Failed to delete message: ${error.message}`);
        }
      }

      result.success = result.errors.length === 0;

      console.log(
        `✅ AutoDelete: Completed - ${result.messagesDeleted}/${result.messagesProcessed} moved to trash`
      );

      return result;
    } catch (error: any) {
      console.error(`❌ AutoDelete: Fatal error:`, error);
      result.errors.push(`Auto-delete failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Task: T061 - Move message to trash via Gmail API
   *
   * Uses Gmail API to move a message to trash
   */
  private async moveToTrash(
    userId: string,
    accountId: string,
    messageExternalId: string
  ): Promise<boolean> {
    try {
      // Get account details
      const account = await ConnectedAccount.findById(accountId);

      if (!account || account.platform !== 'gmail') {
        console.error(`❌ AutoDelete: Invalid account ${accountId}`);
        return false;
      }

      // Get valid access token
      const accessToken = await getGmailAccessToken(accountId);

      if (!accessToken) {
        console.error(`❌ AutoDelete: Failed to get access token for account ${accountId}`);
        return false;
      }

      // Initialize Gmail API client
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Move message to trash using Gmail API
      await gmail.users.messages.trash({
        userId: 'me',
        id: messageExternalId
      });

      console.log(`🗑️  AutoDelete: Gmail API trash successful for ${messageExternalId}`);
      return true;
    } catch (error: any) {
      console.error(`❌ AutoDelete: Gmail API trash failed:`, error);
      return false;
    }
  }

  /**
   * Task: T063 - Restore message from trash
   *
   * Restores a trashed message using Gmail API
   */
  async restoreFromTrash(
    messageId: string,
    userId: string
  ): Promise<boolean> {
    try {
      console.log(`♻️  AutoDelete: Restoring message ${messageId}`);

      // Find message
      const message = await Message.findOne({
        _id: new mongoose.Types.ObjectId(messageId),
        userId: new mongoose.Types.ObjectId(userId),
        isTrashed: true
      });

      if (!message) {
        console.error(`❌ AutoDelete: Message not found or not trashed`);
        return false;
      }

      // Get valid access token
      const accessToken = await getGmailAccessToken(message.accountId.toString());

      if (!accessToken) {
        console.error(`❌ AutoDelete: Failed to get access token`);
        return false;
      }

      // Initialize Gmail API client
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Untrash message using Gmail API
      await gmail.users.messages.untrash({
        userId: 'me',
        id: message.externalId
      });

      // Update message status in database
      await Message.findByIdAndUpdate(messageId, {
        isTrashed: false,
        trashedAt: null,
        autoDeleted: false
      });

      console.log(`✅ AutoDelete: Message restored successfully`);
      return true;
    } catch (error: any) {
      console.error(`❌ AutoDelete: Restore failed:`, error);
      return false;
    }
  }

  /**
   * Task: T063 - Get auto-delete logs for user
   *
   * Returns list of messages that were auto-deleted
   */
  async getAutoDeleteLogs(
    userId: string,
    limit: number = 50
  ): Promise<AutoDeleteLogEntry[]> {
    try {
      const messages = await Message.find({
        userId: userId,
        autoDeleted: true,
        isTrashed: true
      })
        .sort({ trashedAt: -1 })
        .limit(limit)
        .lean();

      // Get analyses for these messages
      const messageIds = messages.map(m => m._id);
      const analyses = await MessageAnalysis.find({
        messageId: { $in: messageIds }
      }).lean();

      const analysisMap = new Map(
        analyses.map(a => [a.messageId.toString(), a])
      );

      return messages.map(message => {
        const analysis = analysisMap.get(message._id.toString());
        return {
          messageId: message._id.toString(),
          subject: message.subject,
          from: message.from,
          spamProbability: analysis?.spamProbability || 0,
          deletedAt: message.trashedAt || new Date(),
          reason: analysis?.isSpam ? `Spam detected (${analysis.spamProbability}%)` : 'Spam detected'
        };
      });
    } catch (error: any) {
      console.error(`❌ AutoDelete: Failed to get logs:`, error);
      return [];
    }
  }

  /**
   * Scheduled cleanup - Remove messages from trash after 30 days
   * This should be called by a cron job
   */
  async cleanupOldTrash(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await Message.deleteMany({
        isTrashed: true,
        trashedAt: { $lt: thirtyDaysAgo }
      });

      console.log(`🧹 AutoDelete: Cleaned up ${result.deletedCount} old trashed messages`);
      return result.deletedCount || 0;
    } catch (error: any) {
      console.error(`❌ AutoDelete: Cleanup failed:`, error);
      return 0;
    }
  }
}

export const autoDeleteService = new AutoDeleteService();
