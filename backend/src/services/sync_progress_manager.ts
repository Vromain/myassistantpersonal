import mongoose from 'mongoose';
import { SyncProgress, ISyncProgress } from '../models/sync_progress';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sync Progress Manager
 * Task: T082 - Handle large message imports with progress indicator
 *
 * Manages sync progress tracking and provides real-time updates
 */

export interface ProgressUpdate {
  processedMessages: number;
  storedMessages: number;
  failedMessages: number;
  currentBatch: number;
  estimatedTimeRemaining?: number;
}

export interface SyncProgressInfo {
  syncId: string;
  status: string;
  totalMessages: number;
  processedMessages: number;
  storedMessages: number;
  failedMessages: number;
  progressPercentage: number;
  successRate: number;
  currentBatch: number;
  totalBatches: number;
  startedAt: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number;
  errors: Array<{
    messageId?: string;
    error: string;
    timestamp: Date;
  }>;
}

class SyncProgressManager {
  /**
   * Create a new sync progress tracker
   */
  async createSyncProgress(data: {
    userId: string;
    accountId: string;
    totalMessages: number;
    syncType?: 'initial' | 'incremental' | 'full';
    batchSize?: number;
  }): Promise<ISyncProgress> {
    const syncId = uuidv4();
    const batchSize = data.batchSize || 50;
    const totalBatches = Math.ceil(data.totalMessages / batchSize);

    const progress = await SyncProgress.create({
      userId: new mongoose.Types.ObjectId(data.userId),
      accountId: new mongoose.Types.ObjectId(data.accountId),
      syncId,
      totalMessages: data.totalMessages,
      processedMessages: 0,
      storedMessages: 0,
      failedMessages: 0,
      status: 'pending',
      currentBatch: 0,
      totalBatches,
      batchSize,
      syncType: data.syncType || 'incremental',
      syncErrors: [],
      startedAt: new Date()
    });

    return progress;
  }

  /**
   * Start sync operation
   */
  async startSync(syncId: string): Promise<void> {
    await SyncProgress.findOneAndUpdate(
      { syncId },
      {
        status: 'syncing',
        startedAt: new Date()
      }
    );
  }

  /**
   * Update sync progress
   */
  async updateProgress(
    syncId: string,
    update: Partial<ProgressUpdate>
  ): Promise<ISyncProgress | null> {
    const progress = await SyncProgress.findOne({ syncId });

    if (!progress) {
      return null;
    }

    // Update fields
    if (update.processedMessages !== undefined) {
      progress.processedMessages = update.processedMessages;
    }
    if (update.storedMessages !== undefined) {
      progress.storedMessages = update.storedMessages;
    }
    if (update.failedMessages !== undefined) {
      progress.failedMessages = update.failedMessages;
    }
    if (update.currentBatch !== undefined) {
      progress.currentBatch = update.currentBatch;
    }

    // Calculate estimated time remaining
    if (progress.processedMessages > 0 && progress.totalMessages > 0) {
      const elapsed = Date.now() - progress.startedAt.getTime();
      const avgTimePerMessage = elapsed / progress.processedMessages;
      const remaining = progress.totalMessages - progress.processedMessages;
      progress.estimatedTimeRemaining = Math.round(avgTimePerMessage * remaining);
    }

    progress.updatedAt = new Date();
    await progress.save();

    return progress;
  }

  /**
   * Add error to sync progress
   */
  async addError(
    syncId: string,
    error: {
      messageId?: string;
      error: string;
    }
  ): Promise<void> {
    await SyncProgress.findOneAndUpdate(
      { syncId },
      {
        $push: {
          syncErrors: {
            messageId: error.messageId,
            error: error.error,
            timestamp: new Date()
          }
        },
        $inc: { failedMessages: 1 }
      }
    );
  }

  /**
   * Complete sync operation
   */
  async completeSync(
    syncId: string,
    success: boolean
  ): Promise<ISyncProgress | null> {
    const status = success ? 'completed' : 'failed';

    const progress = await SyncProgress.findOneAndUpdate(
      { syncId },
      {
        status,
        completedAt: new Date(),
        updatedAt: new Date(),
        estimatedTimeRemaining: 0
      },
      { new: true }
    );

    return progress;
  }

  /**
   * Cancel sync operation
   */
  async cancelSync(syncId: string): Promise<void> {
    await SyncProgress.findOneAndUpdate(
      { syncId },
      {
        status: 'cancelled',
        completedAt: new Date(),
        updatedAt: new Date()
      }
    );
  }

  /**
   * Get sync progress by ID
   */
  async getSyncProgress(syncId: string): Promise<SyncProgressInfo | null> {
    const progress = await SyncProgress.findOne({ syncId }).lean();

    if (!progress) {
      return null;
    }

    const processedMessages = progress.processedMessages || 0;
    const totalMessages = progress.totalMessages || 0;
    const storedMessages = progress.storedMessages || 0;

    const progressPercentage = totalMessages > 0
      ? Math.round((processedMessages / totalMessages) * 100)
      : 0;

    const successRate = processedMessages > 0
      ? Math.round((storedMessages / processedMessages) * 100)
      : 0;

    return {
      syncId: progress.syncId,
      status: progress.status,
      totalMessages,
      processedMessages,
      storedMessages,
      failedMessages: progress.failedMessages || 0,
      progressPercentage,
      successRate,
      currentBatch: progress.currentBatch || 0,
      totalBatches: progress.totalBatches || 0,
      startedAt: progress.startedAt,
      completedAt: progress.completedAt,
      estimatedTimeRemaining: progress.estimatedTimeRemaining,
      errors: progress.syncErrors || []
    };
  }

  /**
   * Get active syncs for a user
   */
  async getActiveSyncs(userId: string): Promise<SyncProgressInfo[]> {
    const syncs = await SyncProgress.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: { $in: ['pending', 'syncing'] }
    })
      .sort({ startedAt: -1 })
      .lean();

    return syncs.map(progress => {
      const processedMessages = progress.processedMessages || 0;
      const totalMessages = progress.totalMessages || 0;
      const storedMessages = progress.storedMessages || 0;

      const progressPercentage = totalMessages > 0
        ? Math.round((processedMessages / totalMessages) * 100)
        : 0;

      const successRate = processedMessages > 0
        ? Math.round((storedMessages / processedMessages) * 100)
        : 0;

      return {
        syncId: progress.syncId,
        status: progress.status,
        totalMessages,
        processedMessages,
        storedMessages,
        failedMessages: progress.failedMessages || 0,
        progressPercentage,
        successRate,
        currentBatch: progress.currentBatch || 0,
        totalBatches: progress.totalBatches || 0,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
        estimatedTimeRemaining: progress.estimatedTimeRemaining,
        errors: progress.syncErrors || []
      };
    });
  }

  /**
   * Get recent syncs for a user
   */
  async getRecentSyncs(
    userId: string,
    limit: number = 10
  ): Promise<SyncProgressInfo[]> {
    const syncs = await SyncProgress.find({
      userId: new mongoose.Types.ObjectId(userId)
    })
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean();

    return syncs.map(progress => {
      const processedMessages = progress.processedMessages || 0;
      const totalMessages = progress.totalMessages || 0;
      const storedMessages = progress.storedMessages || 0;

      const progressPercentage = totalMessages > 0
        ? Math.round((processedMessages / totalMessages) * 100)
        : 0;

      const successRate = processedMessages > 0
        ? Math.round((storedMessages / processedMessages) * 100)
        : 0;

      return {
        syncId: progress.syncId,
        status: progress.status,
        totalMessages,
        processedMessages,
        storedMessages,
        failedMessages: progress.failedMessages || 0,
        progressPercentage,
        successRate,
        currentBatch: progress.currentBatch || 0,
        totalBatches: progress.totalBatches || 0,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
        estimatedTimeRemaining: progress.estimatedTimeRemaining,
        errors: progress.syncErrors || []
      };
    });
  }
}

export const syncProgressManager = new SyncProgressManager();
