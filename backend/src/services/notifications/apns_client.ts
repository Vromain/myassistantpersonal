import apn from '@parse/node-apn';
import { DeviceToken } from '../../models/device_token';
import { NotificationPayload } from './notification_service';

/**
 * APNs Client
 * Task: T063 - Implement APNs integration for iOS push notifications
 *
 * Handles sending push notifications to iOS devices via Apple Push Notification Service
 */

interface APNsConfig {
  teamId: string;
  keyId: string;
  key: string;
  production: boolean;
}

class APNsClient {
  private provider: apn.Provider | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize APNs provider with credentials
   */
  async initialize(): Promise<void> {
    try {
      const config = this.getConfig();

      if (!config) {
        console.warn('⚠️  APNs not configured - push notifications disabled');
        return;
      }

      this.provider = new apn.Provider({
        token: {
          key: config.key,
          keyId: config.keyId,
          teamId: config.teamId
        },
        production: config.production
      });

      this.isInitialized = true;
      console.log(`✅ APNs initialized (${config.production ? 'production' : 'development'} mode)`);
    } catch (error) {
      console.error('❌ Failed to initialize APNs:', error);
      this.isInitialized = false;
    }
  }

  /**
   * Get APNs configuration from environment
   */
  private getConfig(): APNsConfig | null {
    const teamId = process.env.APNS_TEAM_ID;
    const keyId = process.env.APNS_KEY_ID;
    const key = process.env.APNS_KEY; // Can be file path or key content
    const production = process.env.NODE_ENV === 'production';

    if (!teamId || !keyId || !key) {
      return null;
    }

    return { teamId, keyId, key, production };
  }

  /**
   * Send push notification to a specific device token
   */
  async sendToDevice(
    deviceToken: string,
    payload: NotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isInitialized || !this.provider) {
      return {
        success: false,
        error: 'APNs not initialized'
      };
    }

    try {
      const notification = new apn.Notification({
        alert: {
          title: payload.title,
          body: payload.body
        },
        badge: payload.badge,
        sound: 'default',
        topic: process.env.APNS_BUNDLE_ID || 'com.example.communicationhub',
        priority: payload.priority === 'high' ? 10 : 5,
        payload: payload.data,
        mutableContent: 1,
        contentAvailable: 1
      });

      const result = await this.provider.send(notification, deviceToken);

      if (result.failed.length > 0) {
        const failure = result.failed[0];
        console.error('❌ APNs send failed:', failure.response);

        // If token is invalid, mark as inactive
        if (failure.status && (failure.status === 410 || failure.status === 400)) {
          await this.markTokenInactive(deviceToken);
        }

        return {
          success: false,
          error: failure.response?.reason || 'Unknown APNs error'
        };
      }

      console.log(`✅ APNs notification sent to device`);
      return { success: true };
    } catch (error: any) {
      console.error('❌ APNs send error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send push notification to all user's devices
   */
  async sendToUser(
    userId: string,
    payload: NotificationPayload
  ): Promise<{ sent: number; failed: number }> {
    const devices = await DeviceToken.find({
      userId,
      platform: 'ios',
      isActive: true
    });

    if (devices.length === 0) {
      console.log(`ℹ️  No iOS devices registered for user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const device of devices) {
      const result = await this.sendToDevice(device.token, payload);

      if (result.success) {
        sent++;
        // Update last used timestamp
        device.lastUsedAt = new Date();
        await device.save();
      } else {
        failed++;
      }
    }

    console.log(`📊 APNs batch: ${sent} sent, ${failed} failed for user ${userId}`);
    return { sent, failed };
  }

  /**
   * Register a new device token
   */
  async registerToken(
    userId: string,
    token: string,
    deviceId: string
  ): Promise<void> {
    try {
      await DeviceToken.findOneAndUpdate(
        { userId, deviceId },
        {
          userId,
          token,
          deviceId,
          platform: 'ios',
          isActive: true,
          lastUsedAt: new Date()
        },
        { upsert: true, new: true }
      );

      console.log(`✅ Registered APNs token for device ${deviceId}`);
    } catch (error) {
      console.error('❌ Failed to register token:', error);
      throw error;
    }
  }

  /**
   * Unregister a device token
   */
  async unregisterToken(userId: string, deviceId: string): Promise<void> {
    try {
      await DeviceToken.findOneAndUpdate(
        { userId, deviceId },
        { isActive: false }
      );

      console.log(`✅ Unregistered device ${deviceId}`);
    } catch (error) {
      console.error('❌ Failed to unregister token:', error);
      throw error;
    }
  }

  /**
   * Mark a token as inactive (called when APNs reports token invalid)
   */
  private async markTokenInactive(token: string): Promise<void> {
    try {
      await DeviceToken.updateOne(
        { token },
        { isActive: false }
      );

      console.log('⚠️  Marked invalid token as inactive');
    } catch (error) {
      console.error('❌ Failed to mark token inactive:', error);
    }
  }

  /**
   * Cleanup old inactive tokens (run periodically)
   */
  async cleanupOldTokens(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      const result = await DeviceToken.deleteMany({
        isActive: false,
        lastUsedAt: { $lt: cutoffDate }
      });

      const count = result.deletedCount || 0;
      console.log(`🗑️  Cleaned up ${count} old device tokens`);
      return count;
    } catch (error) {
      console.error('❌ Failed to cleanup tokens:', error);
      return 0;
    }
  }

  /**
   * Shutdown the provider
   */
  async shutdown(): Promise<void> {
    if (this.provider) {
      await this.provider.shutdown();
      console.log('✅ APNs provider shutdown');
    }
  }
}

export const apnsClient = new APNsClient();
