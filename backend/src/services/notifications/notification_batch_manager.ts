import { IMessage } from '../../models/message';
import { NotificationPayload, notificationService } from './notification_service';
import { apnsClient } from './apns_client';

/**
 * Notification Batch Manager
 * Task: T064 - Add notification batching for similar messages
 *
 * Groups similar messages arriving within 10 minutes into batched notifications
 */

interface PendingNotification {
  userId: string;
  message: IMessage;
  timestamp: Date;
  category?: string;
  sender?: string;
}

interface BatchKey {
  userId: string;
  category?: string;
  sender?: string;
}

interface NotificationBatch {
  key: BatchKey;
  messages: PendingNotification[];
  firstMessageTime: Date;
  timer?: NodeJS.Timeout;
}

class NotificationBatchManager {
  private batches: Map<string, NotificationBatch> = new Map();
  private readonly BATCH_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
  private readonly MIN_BATCH_SIZE = 2; // Minimum messages to batch

  /**
   * Queue a message for notification (with batching logic)
   */
  async queueNotification(
    userId: string,
    message: IMessage
  ): Promise<void> {
    // Check if notification should be sent
    const decision = await notificationService.shouldSendNotification(userId, message);

    if (!decision.shouldSend) {
      console.log(`⏸️  Notification not sent: ${decision.reason}`);
      return;
    }

    // If high priority or bypassing quiet hours, send immediately without batching
    if (decision.bypassQuietHours) {
      await this.sendImmediateNotification(userId, message);
      return;
    }

    // Add to batch
    this.addToBatch(userId, message);
  }

  /**
   * Add message to appropriate batch
   */
  private addToBatch(userId: string, message: IMessage): void {
    const batchKey = this.getBatchKey(userId, message);
    const batchId = this.generateBatchId(batchKey);

    let batch = this.batches.get(batchId);

    if (!batch) {
      // Create new batch
      batch = {
        key: batchKey,
        messages: [],
        firstMessageTime: new Date()
      };

      // Set timer to send batch after window
      batch.timer = setTimeout(() => {
        this.sendBatch(batchId);
      }, this.BATCH_WINDOW_MS);

      this.batches.set(batchId, batch);
    }

    // Add message to batch
    batch.messages.push({
      userId,
      message,
      timestamp: new Date(),
      category: message.categoryId?.toString(),
      sender: message.sender
    });

    console.log(`📦 Added to batch ${batchId} (${batch.messages.length} messages)`);
  }

  /**
   * Generate batch key for grouping similar messages
   */
  private getBatchKey(userId: string, message: IMessage): BatchKey {
    return {
      userId,
      category: message.categoryId?.toString(),
      sender: message.sender
    };
  }

  /**
   * Generate unique batch ID from key
   */
  private generateBatchId(key: BatchKey): string {
    const parts = [
      key.userId,
      key.category || 'uncategorized',
      key.sender || 'unknown'
    ];
    return parts.join(':');
  }

  /**
   * Send a batch of notifications
   */
  private async sendBatch(batchId: string): Promise<void> {
    const batch = this.batches.get(batchId);

    if (!batch || batch.messages.length === 0) {
      this.batches.delete(batchId);
      return;
    }

    // Clear timer
    if (batch.timer) {
      clearTimeout(batch.timer);
    }

    const messageCount = batch.messages.length;

    // If only one message, send individual notification
    if (messageCount < this.MIN_BATCH_SIZE) {
      const pending = batch.messages[0];
      await this.sendImmediateNotification(pending.userId, pending.message);
      this.batches.delete(batchId);
      return;
    }

    // Send batched notification
    await this.sendBatchedNotification(batch);
    this.batches.delete(batchId);
  }

  /**
   * Send immediate notification (no batching)
   */
  private async sendImmediateNotification(
    userId: string,
    message: IMessage
  ): Promise<void> {
    try {
      const payload = await notificationService.buildNotificationPayload(
        userId,
        message
      );

      const result = await apnsClient.sendToUser(userId, payload);

      console.log(`📱 Sent immediate notification: ${result.sent} sent, ${result.failed} failed`);
    } catch (error) {
      console.error('❌ Failed to send immediate notification:', error);
    }
  }

  /**
   * Send batched notification
   */
  private async sendBatchedNotification(batch: NotificationBatch): Promise<void> {
    try {
      const messageCount = batch.messages.length;
      const firstMessage = batch.messages[0].message;
      const userId = batch.key.userId;

      // Build batched notification payload
      let title: string;
      let body: string;

      if (batch.key.sender) {
        // Multiple messages from same sender
        title = `${messageCount} new messages from ${firstMessage.sender || batch.key.sender}`;
        body = batch.messages.map(p => p.message.subject || '(No subject)').join(', ');
      } else if (batch.key.category) {
        // Multiple messages in same category
        title = `${messageCount} new messages in ${batch.key.category}`;
        body = batch.messages.map(p =>
          `${p.message.sender || p.message.sender}: ${p.message.subject || '(No subject)'}`
        ).join('\n');
      } else {
        // General batch
        title = `${messageCount} new messages`;
        body = batch.messages.map(p =>
          `${p.message.sender || p.message.sender}: ${p.message.subject || '(No subject)'}`
        ).join('\n');
      }

      // Truncate body if too long
      if (body.length > 200) {
        body = body.substring(0, 197) + '...';
      }

      const payload: NotificationPayload = {
        userId,
        messageId: firstMessage._id.toString(),
        title,
        body,
        priority: firstMessage.priorityLevel,
        badge: messageCount,
        data: {
          batchSize: messageCount,
          messageIds: batch.messages.map(p => p.message._id.toString()),
          category: batch.key.category,
          sender: batch.key.sender,
          timestamp: new Date().toISOString()
        }
      };

      const result = await apnsClient.sendToUser(userId, payload);

      console.log(`📦 Sent batched notification (${messageCount} messages): ${result.sent} sent, ${result.failed} failed`);
    } catch (error) {
      console.error('❌ Failed to send batched notification:', error);
    }
  }

  /**
   * Force send all pending batches (useful for shutdown)
   */
  async flushAllBatches(): Promise<void> {
    const batchIds = Array.from(this.batches.keys());

    for (const batchId of batchIds) {
      await this.sendBatch(batchId);
    }

    console.log(`✅ Flushed ${batchIds.length} notification batches`);
  }

  /**
   * Get batch statistics
   */
  getBatchStats(): {
    activeBatches: number;
    totalPendingMessages: number;
    batches: Array<{ batchId: string; messageCount: number; age: number }>;
  } {
    const now = new Date();
    const batches = Array.from(this.batches.entries()).map(([batchId, batch]) => ({
      batchId,
      messageCount: batch.messages.length,
      age: now.getTime() - batch.firstMessageTime.getTime()
    }));

    return {
      activeBatches: this.batches.size,
      totalPendingMessages: batches.reduce((sum, b) => sum + b.messageCount, 0),
      batches
    };
  }
}

export const notificationBatchManager = new NotificationBatchManager();
