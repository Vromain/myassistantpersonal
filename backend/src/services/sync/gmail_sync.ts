import { google } from 'googleapis';
import { ConnectedAccount, IConnectedAccount } from '../../models/connected_account';
import { Message, IMessage } from '../../models/message';
import { getMessageSqlRepo, MessageSql } from '../../models/message_sql';
import { getGmailAccessToken } from '../auth/gmail_strategy';
import { ollamaClient } from '../ollama_client';
import { createUserRateLimiter, RateLimiter } from '../rate_limiter';
import { syncProgressManager } from '../sync_progress_manager';

/**
 * Gmail Sync Service
 * Task: T021 - Implement Gmail sync service for fetching and storing messages
 * Task: T080 - Rate limit handling for Gmail API with queue and retry logic
 * Reference: specs/001-ai-communication-hub/plan.md
 *
 * Syncs messages from Gmail to local database with AI priority scoring
 * Implements rate limiting to stay within Gmail's 250 units/second quota
 */

export interface SyncResult {
  success: boolean;
  messagesFetched: number;
  messagesStored: number;
  errors: string[];
  lastSyncedAt: Date;
  syncId?: string; // T082: Progress tracking ID
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string; attachmentId?: string; size?: number };
      filename?: string;
    }>;
  };
  internalDate: string;
}

export class GmailSyncService {
  // Rate limiter cache per user (Gmail has per-user quotas)
  private rateLimiters = new Map<string, RateLimiter>();

  /**
   * Get or create rate limiter for a user
   */
  private getRateLimiter(userId: string): RateLimiter {
    if (!this.rateLimiters.has(userId)) {
      this.rateLimiters.set(userId, createUserRateLimiter(userId));
    }
    return this.rateLimiters.get(userId)!;
  }

  /**
   * Sync messages for a specific Gmail account
   */
  async syncAccount(accountId: string): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      messagesFetched: 0,
      messagesStored: 0,
      errors: [],
      lastSyncedAt: new Date()
    };

    try {
      // Get account details
      const account = await ConnectedAccount.findById(accountId);

      if (!account || account.platform !== 'gmail') {
        result.errors.push('Account not found or not a Gmail account');
        return result;
      }

      console.log(`📧 Starting Gmail sync for ${account.email}...`);

      // Update sync status
      account.syncStatus = 'syncing';
      await account.save();

      // Get valid access token
      const accessToken = await getGmailAccessToken(accountId);

      if (!accessToken) {
        result.errors.push('Failed to obtain valid access token');
        account.syncStatus = 'error';
        await account.save();
        return result;
      }

      // Initialize Gmail API client
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Get rate limiter for this user
      const rateLimiter = this.getRateLimiter(account.userId.toString());

      // Determine sync range
      const syncFrom = account.lastSync || account.syncSettings.syncFrom;
      const query = this.buildGmailQuery(syncFrom);

      // Fetch message list with rate limiting
      // messages.list costs ~5 quota units
      const messageList = await rateLimiter.execute(
        async () => gmail.users.messages.list({
          userId: 'me',
          q: query || undefined,
          maxResults: 500 // Gmail API limit
        }),
        5 // quota cost
      );

      const messages = messageList.data.messages || [];
      result.messagesFetched = messages.length;

      console.log(`📨 Found ${messages.length} messages to sync`);

      // T082: Create progress tracker for large imports
      const progress = await syncProgressManager.createSyncProgress({
        userId: account.userId.toString(),
        accountId: accountId,
        totalMessages: messages.length,
        syncType: account.lastSync ? 'incremental' : 'initial',
        batchSize: 50
      });

      result.syncId = progress.syncId;

      // Start sync
      await syncProgressManager.startSync(progress.syncId);

      // T082: Process messages in batches to avoid overwhelming the system
      const BATCH_SIZE = 50;
      const batches = [];
      for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        batches.push(messages.slice(i, i + BATCH_SIZE));
      }

      console.log(`📦 Processing ${batches.length} batches of ${BATCH_SIZE} messages`);

      // Process each batch
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length}...`);

        // Process messages in current batch
        for (const msgRef of batch) {
          try {
            // messages.get costs ~5 quota units
            const fullMessage = await rateLimiter.execute(
              async () => gmail.users.messages.get({
                userId: 'me',
                id: msgRef.id!,
                format: 'full'
              }),
              5 // quota cost
            );

            const stored = await this.storeMessage(
              account,
              fullMessage.data as GmailMessage
            );

            if (stored) {
              result.messagesStored++;
            }

            // Update progress after each message
            await syncProgressManager.updateProgress(progress.syncId, {
              processedMessages: result.messagesStored + result.errors.length,
              storedMessages: result.messagesStored,
              failedMessages: result.errors.length,
              currentBatch: batchIndex + 1
            });

          } catch (error: any) {
            console.error(`❌ Error processing message ${msgRef.id}:`, error.message);
            result.errors.push(`Message ${msgRef.id}: ${error.message}`);

            // Track error in progress
            await syncProgressManager.addError(progress.syncId, {
              messageId: msgRef.id,
              error: error.message
            });
          }
        }

        // Small delay between batches to avoid overwhelming the system
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Update account sync status
      account.syncStatus = 'active';
      account.lastSync = new Date();
      await account.save();

      // T082: Mark sync as complete
      await syncProgressManager.completeSync(progress.syncId, true);

      result.success = true;
      console.log(`✅ Gmail sync complete: ${result.messagesStored}/${result.messagesFetched} messages stored`);
      console.log(`📊 Progress tracking ID: ${progress.syncId}`);

      return result;
    } catch (error: any) {
      console.error('❌ Gmail sync failed:', error);
      result.errors.push(error.message);

      // T082: Mark sync as failed if it was started
      if (result.syncId) {
        await syncProgressManager.completeSync(result.syncId, false);
      }

      // Update account status
      const account = await ConnectedAccount.findById(accountId);
      if (account) {
        account.syncStatus = 'error';
        account.connectionHealth = 'error';
        account.errorMessage = error.message;
        await account.save();
      }

      return result;
    }
  }

  /**
   * Build Gmail search query based on sync date
   */
  private buildGmailQuery(syncFrom?: Date): string {
    if (!syncFrom) {
      // First sync - no filter to fetch recent messages
      return '';
    }

    // Incremental sync - get messages since last sync
    return `after:${this.formatDateForGmail(syncFrom)}`;
  }

  /**
   * Format date for Gmail query (YYYY/MM/DD)
   */
  private formatDateForGmail(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  /**
   * Store Gmail message in database
   */
  private async storeMessage(
    account: IConnectedAccount,
    gmailMessage: GmailMessage
  ): Promise<boolean> {
    try {
      // Check if message already exists
      const existing = await Message.findOne({
        accountId: (account as any).id,
        externalId: gmailMessage.id
      });

      if (existing) {
        // Update read status if changed
        const isUnread = gmailMessage.labelIds?.includes('UNREAD');
        if (existing.readStatus === isUnread) {
          existing.readStatus = !isUnread;
          await existing.save();
        }
        return false; // Already exists
      }

      // Parse message headers
      const headers = this.parseHeaders(gmailMessage.payload.headers);

      // Extract message body
      const body = this.extractBody(gmailMessage);

      // Extract attachments
      const attachments = this.extractAttachments(gmailMessage);

      // Create message document (MongoDB)
      const message = new Message({
        userId: (account as any).userId,
        accountId: (account as any).id,
        externalId: gmailMessage.id,
        platform: 'gmail',
        sender: headers.from,
        recipient: headers.to,
        subject: headers.subject,
        content: body,
        timestamp: new Date(parseInt(gmailMessage.internalDate)),
        readStatus: !gmailMessage.labelIds?.includes('UNREAD'),
        priorityScore: 50, // Default, will be updated by AI
        priorityLevel: 'medium',
        attachments,
        metadata: {
          threadId: gmailMessage.threadId,
          labelIds: gmailMessage.labelIds,
          snippet: gmailMessage.snippet
        }
      });

      // Check urgency keywords
      message.isUrgent = (message as any).checkUrgency();

      // Score priority with AI (async, don't block)
      this.scorePriorityAsync(message);

      await message.save();

      // Also store in MySQL (TypeORM)
      try {
        const repo = await getMessageSqlRepo();
        const existingSql = await repo.findOne({ where: { accountId: (account as any).id, externalId: gmailMessage.id } });
        if (!existingSql) {
          const sqlMsg = repo.create({
            userId: (account as any).userId,
            accountId: (account as any).id,
            externalId: gmailMessage.id,
            platform: 'gmail',
            sender: headers.from,
            recipient: headers.to,
            subject: headers.subject,
            content: body,
            timestamp: new Date(parseInt(gmailMessage.internalDate)),
            readStatus: !gmailMessage.labelIds?.includes('UNREAD'),
            priorityScore: 50,
            priorityLevel: 'medium',
            attachments,
            isUrgent: message.isUrgent,
            metadata: {
              threadId: gmailMessage.threadId,
              labelIds: gmailMessage.labelIds,
              snippet: gmailMessage.snippet
            },
            archivedAt: null
          } as Partial<MessageSql>);
          await repo.save(sqlMsg);
        }
      } catch (e) {
        console.warn('⚠️  Failed to store message in MySQL:', (e as any).message);
      }

      // T028: Trigger AI analysis for the new message (async, don't block sync)
      this.analyzeMessageAsync(message._id.toString());

      return true;
    } catch (error: any) {
      console.error('❌ Error storing message:', error.message);
      return false;
    }
  }

  /**
   * Parse email headers into usable format
   */
  private parseHeaders(headers: Array<{ name: string; value: string }>): {
    from: string;
    to: string;
    subject: string;
    date?: string;
  } {
    const headerMap: Record<string, string> = {};

    headers.forEach(header => {
      headerMap[header.name.toLowerCase()] = header.value;
    });

    return {
      from: headerMap['from'] || 'unknown@unknown.com',
      to: headerMap['to'] || 'unknown@unknown.com',
      subject: headerMap['subject'] || '(No Subject)',
      date: headerMap['date']
    };
  }

  /**
   * Extract message body from Gmail message
   */
  private extractBody(gmailMessage: GmailMessage): string {
    try {
      // Try to get body from main payload
      if (gmailMessage.payload.body?.data) {
        return this.decodeBase64(gmailMessage.payload.body.data);
      }

      // Try to get from parts (multipart message)
      if (gmailMessage.payload.parts) {
        for (const part of gmailMessage.payload.parts) {
          // Prefer text/plain
          if (part.mimeType === 'text/plain' && part.body?.data) {
            return this.decodeBase64(part.body.data);
          }
        }

        // Fallback to text/html
        for (const part of gmailMessage.payload.parts) {
          if (part.mimeType === 'text/html' && part.body?.data) {
            return this.stripHtml(this.decodeBase64(part.body.data));
          }
        }
      }

      // Fallback to snippet
      return gmailMessage.snippet || '';
    } catch (error) {
      console.error('❌ Error extracting body:', error);
      return gmailMessage.snippet || '';
    }
  }

  /**
   * Decode base64url encoded string
   */
  private decodeBase64(encoded: string): string {
    try {
      // Gmail uses base64url encoding
      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      return Buffer.from(base64, 'base64').toString('utf-8');
    } catch (error) {
      return encoded;
    }
  }

  /**
   * Strip HTML tags from text
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Extract attachments from Gmail message
   */
  private extractAttachments(gmailMessage: GmailMessage): Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }> {
    const attachments: Array<{
      filename: string;
      mimeType: string;
      size: number;
      attachmentId: string;
    }> = [];

    if (!gmailMessage.payload.parts) {
      return attachments;
    }

    for (const part of gmailMessage.payload.parts) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId
        });
      }
    }

    return attachments;
  }

  /**
   * Score message priority with AI (async, non-blocking)
   */
  private async scorePriorityAsync(message: IMessage): Promise<void> {
    try {
      const result = await ollamaClient.scorePriority({
        subject: message.subject,
        content: message.content,
        sender: message.sender
      });

      // Update message with AI score
      await (message as any).updatePriority(result.score, result.reasoning);

      console.log(`🤖 AI scored message: ${result.score} - ${message.subject?.slice(0, 50)}`);
    } catch (error) {
      console.error('❌ AI priority scoring failed:', error);
      // Message already saved with default score, no action needed
    }
  }

  /**
   * Trigger AI analysis for a message (async, non-blocking)
   * Task: T028 - Integrate analysis into sync flow
   */
  private async analyzeMessageAsync(messageId: string): Promise<void> {
    try {
      const { messageAnalysisService } = await import('../message_analysis_service');
      await messageAnalysisService.analyzeMessage(messageId);
      console.log(`🔍 Message analysis completed: ${messageId}`);
    } catch (error: any) {
      console.error('❌ Message analysis failed:', error.message);
      // Don't block sync if analysis fails
    }
  }

  /**
   * Sync multiple accounts in parallel
   */
  async syncMultipleAccounts(accountIds: string[]): Promise<Map<string, SyncResult>> {
    const results = new Map<string, SyncResult>();

    // Sync accounts in parallel (max 3 at a time to avoid rate limits)
    const batchSize = 3;
    for (let i = 0; i < accountIds.length; i += batchSize) {
      const batch = accountIds.slice(i, i + batchSize);
      const promises = batch.map(id => this.syncAccount(id));
      const batchResults = await Promise.all(promises);

      batch.forEach((id, index) => {
        results.set(id, batchResults[index]);
      });
    }

    return results;
  }

  /**
   * Sync all user's Gmail accounts
   */
  async syncUserAccounts(userId: string): Promise<Map<string, SyncResult>> {
    const accounts = await ConnectedAccount.find({
      userId,
      platform: 'gmail',
      syncStatus: { $in: ['active', 'paused', 'error'] }
    });

    const accountIds = accounts.map(acc => acc.id);
    return this.syncMultipleAccounts(accountIds);
  }
}

// Export singleton instance
export const gmailSyncService = new GmailSyncService();
export default GmailSyncService;
