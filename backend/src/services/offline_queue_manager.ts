import mongoose from 'mongoose';
import { OfflineOperation, IOfflineOperation, OperationType } from '../models/offline_operation';
import { messageAggregator } from './message_aggregator';

/**
 * Offline Queue Manager
 * Task: T084 - Add offline mode with queued message sync
 *
 * Manages offline operations queue and processes them when online
 */

export interface QueueOperationInput {
  userId: string;
  operationType: OperationType;
  resourceType: 'message' | 'category' | 'account';
  resourceId?: string;
  data: Record<string, any>;
  priority?: number;
  clientId?: string;
  clientTimestamp?: Date;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

class OfflineQueueManager {
  /**
   * Add operation to queue
   */
  async enqueue(input: QueueOperationInput): Promise<IOfflineOperation> {
    const operation = await OfflineOperation.create({
      userId: new mongoose.Types.ObjectId(input.userId),
      operationType: input.operationType,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      data: input.data,
      status: 'pending',
      priority: input.priority || 5,
      retryCount: 0,
      maxRetries: 3,
      clientId: input.clientId,
      clientTimestamp: input.clientTimestamp,
      createdAt: new Date()
    });

    console.log(`📥 Queued ${input.operationType} operation for user ${input.userId}`);
    return operation;
  }

  /**
   * Get pending operations for a user
   */
  async getPendingOperations(userId: string): Promise<any[]> {
    return OfflineOperation.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'pending'
    })
      .sort({ priority: -1, createdAt: 1 }) // Higher priority first, then FIFO
      .lean();
  }

  /**
   * Get queue statistics for a user
   */
  async getQueueStats(userId: string): Promise<QueueStats> {
    const operations = await OfflineOperation.find({
      userId: new mongoose.Types.ObjectId(userId)
    });

    return {
      pending: operations.filter(op => op.status === 'pending').length,
      processing: operations.filter(op => op.status === 'processing').length,
      completed: operations.filter(op => op.status === 'completed').length,
      failed: operations.filter(op => op.status === 'failed').length,
      total: operations.length
    };
  }

  /**
   * Process a single operation
   */
  async processOperation(operationId: string): Promise<boolean> {
    const operation = await OfflineOperation.findById(operationId);

    if (!operation) {
      console.error('❌ Operation not found:', operationId);
      return false;
    }

    if (operation.status !== 'pending' && operation.status !== 'failed') {
      console.warn('⚠️  Operation not in processable state:', operation.status);
      return false;
    }

    try {
      // Mark as processing
      operation.status = 'processing';
      await operation.save();

      // Execute operation based on type
      const success = await this.executeOperation(operation);

      if (success) {
        operation.status = 'completed';
        operation.processedAt = new Date();
        console.log(`✅ Processed ${operation.operationType} operation`);
      } else {
        throw new Error('Operation execution returned false');
      }

      await operation.save();
      return true;

    } catch (error: any) {
      console.error(`❌ Error processing operation ${operationId}:`, error);

      operation.retryCount++;
      operation.lastError = error.message;

      if (operation.retryCount >= operation.maxRetries) {
        operation.status = 'failed';
        operation.processedAt = new Date();
        console.error(`❌ Operation failed after ${operation.retryCount} retries`);
      } else {
        operation.status = 'pending';
        console.log(`🔄 Will retry operation (attempt ${operation.retryCount + 1}/${operation.maxRetries})`);
      }

      await operation.save();
      return false;
    }
  }

  /**
   * Execute the actual operation
   */
  private async executeOperation(operation: IOfflineOperation): Promise<boolean> {
    const userId = operation.userId.toString();

    switch (operation.operationType) {
      case 'mark_read':
        return this.executeMarkRead(userId, operation);

      case 'mark_unread':
        return this.executeMarkUnread(userId, operation);

      case 'archive':
        return this.executeArchive(userId, operation);

      case 'unarchive':
        return this.executeUnarchive(userId, operation);

      case 'categorize':
        return this.executeCategorize(userId, operation);

      case 'send_reply':
        return this.executeSendReply(userId, operation);

      case 'delete':
        return this.executeDelete(userId, operation);

      default:
        console.error('❌ Unknown operation type:', operation.operationType);
        return false;
    }
  }

  /**
   * Execute mark as read
   */
  private async executeMarkRead(userId: string, operation: IOfflineOperation): Promise<boolean> {
    const { messageId } = operation.data;
    if (!messageId) return false;

    const success = await messageAggregator.updateReadStatus(messageId, userId, true);
    return success;
  }

  /**
   * Execute mark as unread
   */
  private async executeMarkUnread(userId: string, operation: IOfflineOperation): Promise<boolean> {
    const { messageId } = operation.data;
    if (!messageId) return false;

    const success = await messageAggregator.updateReadStatus(messageId, userId, false);
    return success;
  }

  /**
   * Execute archive
   */
  private async executeArchive(userId: string, operation: IOfflineOperation): Promise<boolean> {
    const { messageId } = operation.data;
    if (!messageId) return false;

    const success = await messageAggregator.archiveMessage(messageId, userId, true);
    return success;
  }

  /**
   * Execute unarchive
   */
  private async executeUnarchive(userId: string, operation: IOfflineOperation): Promise<boolean> {
    const { messageId } = operation.data;
    if (!messageId) return false;

    const success = await messageAggregator.archiveMessage(messageId, userId, false);
    return success;
  }

  /**
   * Execute categorization
   */
  private async executeCategorize(userId: string, operation: IOfflineOperation): Promise<boolean> {
    const { messageId, categoryId } = operation.data;
    if (!messageId) return false;

    const message = await messageAggregator.updateMessageCategory(messageId, userId, categoryId);
    return message !== null;
  }

  /**
   * Execute send reply (placeholder - would integrate with gmail_reply service)
   */
  private async executeSendReply(userId: string, operation: IOfflineOperation): Promise<boolean> {
    const { messageId, replyContent, replyAll } = operation.data;
    if (!messageId || !replyContent) return false;

    // This would call gmailReplyService.sendReply()
    console.log('📧 Sending queued reply for message:', messageId);

    // Import and call reply service
    const { gmailReplyService } = await import('./sync/gmail_reply');
    const result = await gmailReplyService.sendReply({
      messageId,
      userId,
      replyContent,
      replyAll: replyAll || false
    });

    return result.success;
  }

  /**
   * Execute delete (placeholder)
   */
  private async executeDelete(userId: string, operation: IOfflineOperation): Promise<boolean> {
    const { messageId } = operation.data;
    if (!messageId) return false;

    console.log('🗑️  Deleting message:', messageId);
    // Would implement actual message deletion
    return true;
  }

  /**
   * Process all pending operations for a user
   */
  async processUserQueue(userId: string): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    const operations = await this.getPendingOperations(userId);

    let succeeded = 0;
    let failed = 0;

    for (const operation of operations) {
      const success = await this.processOperation(operation._id.toString());
      if (success) {
        succeeded++;
      } else {
        failed++;
      }
    }

    console.log(`📊 Queue processing complete: ${succeeded} succeeded, ${failed} failed`);

    return {
      processed: operations.length,
      succeeded,
      failed
    };
  }

  /**
   * Clear completed operations for a user
   */
  async clearCompleted(userId: string): Promise<number> {
    const result = await OfflineOperation.deleteMany({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'completed'
    });

    return result.deletedCount || 0;
  }

  /**
   * Retry failed operations
   */
  async retryFailed(userId: string): Promise<number> {
    const failedOps = await OfflineOperation.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'failed',
      retryCount: { $lt: 3 }
    });

    for (const op of failedOps) {
      op.status = 'pending';
      op.retryCount = 0;
      await op.save();
    }

    return failedOps.length;
  }
}

export const offlineQueueManager = new OfflineQueueManager();
