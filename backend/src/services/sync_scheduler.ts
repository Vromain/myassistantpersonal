import { ConnectedAccount } from '../models/connected_account';
import { gmailSyncService } from './sync/gmail_sync';

/**
 * Sync Scheduler Service
 * Task: T027 - Implement background sync scheduler
 * Reference: specs/001-ai-communication-hub/plan.md
 *
 * Manages automatic background synchronization for all connected accounts
 */

export interface SchedulerConfig {
  defaultInterval: number; // minutes
  enabled: boolean;
  maxConcurrent: number; // max accounts to sync simultaneously
}

export class SyncScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private config: SchedulerConfig;
  private isRunning: boolean = false;

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = {
      defaultInterval: 5, // 5 minutes default
      enabled: true,
      maxConcurrent: 5,
      ...config
    };
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.warn('⚠️  Sync scheduler already running');
      return;
    }

    if (!this.config.enabled) {
      console.log('⚠️  Sync scheduler is disabled');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Sync scheduler started');

    // Run initial sync after 30 seconds
    setTimeout(() => {
      this.scheduleAllAccounts();
    }, 30000);

    // Re-schedule all accounts every hour to pick up new accounts
    setInterval(() => {
      this.scheduleAllAccounts();
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Clear all intervals
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();

    console.log('🛑 Sync scheduler stopped');
  }

  /**
   * Schedule sync for all active accounts
   */
  async scheduleAllAccounts(): Promise<void> {
    try {
      console.log('📅 Scheduling sync for all accounts...');

      const accounts = await ConnectedAccount.find({
        syncStatus: { $in: ['active', 'paused'] },
        'syncSettings.enabled': true
      });

      console.log(`📊 Found ${accounts.length} accounts to schedule`);

      for (const account of accounts) {
        await this.scheduleAccount(account.id);
      }
    } catch (error) {
      console.error('❌ Error scheduling accounts:', error);
    }
  }

  /**
   * Schedule sync for a specific account
   */
  async scheduleAccount(accountId: string): Promise<void> {
    try {
      const account = await ConnectedAccount.findById(accountId);

      if (!account) {
        console.error(`❌ Account not found: ${accountId}`);
        return;
      }

      if (!account.syncSettings.enabled) {
        console.log(`⏸️  Sync disabled for ${account.email}`);
        return;
      }

      // Clear existing interval if any
      if (this.intervals.has(accountId)) {
        clearInterval(this.intervals.get(accountId)!);
        this.intervals.delete(accountId);
      }

      // Get sync frequency (in seconds)
      const frequency = account.syncSettings.frequency || this.config.defaultInterval * 60;

      // Convert to milliseconds
      const intervalMs = frequency * 1000;

      console.log(`⏰ Scheduling ${account.email} every ${frequency}s`);

      // Schedule recurring sync
      const interval = setInterval(async () => {
        await this.syncAccount(accountId);
      }, intervalMs);

      this.intervals.set(accountId, interval);

      // Run immediate sync for newly scheduled account
      await this.syncAccount(accountId);
    } catch (error) {
      console.error(`❌ Error scheduling account ${accountId}:`, error);
    }
  }

  /**
   * Unschedule an account
   */
  unscheduleAccount(accountId: string): void {
    if (this.intervals.has(accountId)) {
      clearInterval(this.intervals.get(accountId)!);
      this.intervals.delete(accountId);
      console.log(`🚫 Unscheduled account ${accountId}`);
    }
  }

  /**
   * Sync a specific account
   */
  private async syncAccount(accountId: string): Promise<void> {
    try {
      const account = await ConnectedAccount.findById(accountId);

      if (!account) {
        console.error(`❌ Account not found: ${accountId}`);
        this.unscheduleAccount(accountId);
        return;
      }

      // Check if account is already syncing
      if (account.syncStatus === 'syncing') {
        console.log(`⏳ Account ${account.email} is already syncing, skipping...`);
        return;
      }

      console.log(`🔄 Starting sync for ${account.email}...`);

      // Sync based on platform
      let result;
      switch (account.platform) {
        case 'gmail':
          result = await gmailSyncService.syncAccount(accountId);
          break;

        case 'exchange':
          // TODO: Implement Exchange sync
          console.warn(`⚠️  Exchange sync not yet implemented for ${account.email}`);
          return;

        case 'imap':
          // TODO: Implement IMAP sync
          console.warn(`⚠️  IMAP sync not yet implemented for ${account.email}`);
          return;

        default:
          console.error(`❌ Unsupported platform: ${account.platform}`);
          return;
      }

      if (result.success) {
        console.log(`✅ Sync completed for ${account.email}: ${result.messagesStored} messages`);
      } else {
        console.error(`❌ Sync failed for ${account.email}:`, result.errors);

        // If sync fails multiple times, pause the account
        if (result.errors.length > 0 && account.syncStatus === 'error') {
          console.warn(`⚠️  Pausing sync for ${account.email} due to repeated errors`);
          this.unscheduleAccount(accountId);
        }
      }
    } catch (error) {
      console.error(`❌ Error syncing account ${accountId}:`, error);
    }
  }

  /**
   * Trigger immediate sync for an account
   */
  async triggerSync(accountId: string): Promise<void> {
    await this.syncAccount(accountId);
  }

  /**
   * Trigger immediate sync for a user's accounts
   */
  async triggerUserSync(userId: string): Promise<void> {
    try {
      const accounts = await ConnectedAccount.find({
        userId,
        syncStatus: { $in: ['active', 'paused', 'error'] }
      });

      console.log(`🔄 Triggering sync for ${accounts.length} accounts (user ${userId})`);

      // Sync accounts in batches to avoid overwhelming the system
      const batchSize = this.config.maxConcurrent;
      for (let i = 0; i < accounts.length; i += batchSize) {
        const batch = accounts.slice(i, i + batchSize);
        await Promise.all(batch.map(account => this.syncAccount(account.id)));
      }
    } catch (error) {
      console.error(`❌ Error triggering user sync for ${userId}:`, error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    scheduledAccounts: number;
    config: SchedulerConfig;
  } {
    return {
      isRunning: this.isRunning,
      scheduledAccounts: this.intervals.size,
      config: this.config
    };
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(config: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('✅ Scheduler configuration updated:', this.config);

    if (config.enabled === false && this.isRunning) {
      this.stop();
    } else if (config.enabled === true && !this.isRunning) {
      this.start();
    }
  }

  /**
   * Pause sync for an account
   */
  async pauseAccount(accountId: string): Promise<void> {
    try {
      const account = await ConnectedAccount.findById(accountId);

      if (!account) {
        console.error(`❌ Account not found: ${accountId}`);
        return;
      }

      account.syncStatus = 'paused';
      await account.save();

      this.unscheduleAccount(accountId);

      console.log(`⏸️  Sync paused for ${account.email}`);
    } catch (error) {
      console.error(`❌ Error pausing account ${accountId}:`, error);
    }
  }

  /**
   * Resume sync for an account
   */
  async resumeAccount(accountId: string): Promise<void> {
    try {
      const account = await ConnectedAccount.findById(accountId);

      if (!account) {
        console.error(`❌ Account not found: ${accountId}`);
        return;
      }

      account.syncStatus = 'active';
      await account.save();

      await this.scheduleAccount(accountId);

      console.log(`▶️  Sync resumed for ${account.email}`);
    } catch (error) {
      console.error(`❌ Error resuming account ${accountId}:`, error);
    }
  }

  /**
   * Clean up scheduler on shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down sync scheduler...');
    this.stop();
    console.log('✅ Sync scheduler shutdown complete');
  }
}

// Export singleton instance
export const syncScheduler = new SyncScheduler({
  defaultInterval: parseInt(process.env.SYNC_INTERVAL_MINUTES || '5'),
  enabled: process.env.SYNC_ENABLED !== 'false',
  maxConcurrent: parseInt(process.env.SYNC_MAX_CONCURRENT || '5')
});

export default SyncScheduler;
