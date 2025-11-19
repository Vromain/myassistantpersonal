import { IUser, IQuietHours, INotificationRule } from '../../models/user';
import { IMessage } from '../../models/message';
import { User } from '../../models/user';

/**
 * Notification Service
 * Task: T062 - Create notification service with quiet hours logic
 *
 * Handles intelligent notification delivery based on:
 * - Quiet hours configuration
 * - Priority thresholds
 * - Keyword matching
 * - High-priority bypass rules
 */

export interface NotificationDecision {
  shouldSend: boolean;
  reason: string;
  bypassQuietHours?: boolean;
}

export interface NotificationPayload {
  userId: string;
  messageId: string;
  title: string;
  body: string;
  priority: 'high' | 'medium' | 'low';
  badge?: number;
  data: Record<string, any>;
}

class NotificationService {
  /**
   * Determine if a notification should be sent for a message
   */
  async shouldSendNotification(
    userId: string,
    message: IMessage
  ): Promise<NotificationDecision> {
    const user = await User.findById(userId);

    if (!user) {
      return {
        shouldSend: false,
        reason: 'User not found'
      };
    }

    // Check if message is high priority - bypasses all filters
    if (message.priorityLevel === 'high') {
      return {
        shouldSend: true,
        reason: 'High priority message - bypasses all filters',
        bypassQuietHours: true
      };
    }

    // Check for urgent keywords that bypass filters
    const hasUrgentKeywords = this.checkUrgentKeywords(message, user.preferences.notificationRules);
    if (hasUrgentKeywords) {
      return {
        shouldSend: true,
        reason: 'Message contains urgent keywords',
        bypassQuietHours: true
      };
    }

    // Check quiet hours (unless bypassed)
    const quietHoursActive = this.isQuietHoursActive(user.preferences.quietHours);
    if (quietHoursActive) {
      return {
        shouldSend: false,
        reason: 'Quiet hours active - notification queued until end of quiet hours'
      };
    }

    // Check notification rules for priority threshold
    const meetsThreshold = this.meetsPriorityThreshold(
      message.priorityLevel,
      user.preferences.notificationRules
    );

    if (!meetsThreshold) {
      return {
        shouldSend: false,
        reason: 'Message priority below notification threshold'
      };
    }

    return {
      shouldSend: true,
      reason: 'All notification criteria met'
    };
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHoursActive(quietHours?: IQuietHours): boolean {
    if (!quietHours || !quietHours.enabled) {
      return false;
    }

    const now = new Date();

    // Convert to user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: quietHours.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const currentTime = formatter.format(now);
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const currentMinutes = currentHour * 60 + currentMinute;

    // Parse quiet hours times
    const [startHour, startMinute] = quietHours.startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;

    const [endHour, endMinute] = quietHours.endTime.split(':').map(Number);
    const endMinutes = endHour * 60 + endMinute;

    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    // Handle same-day quiet hours
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  /**
   * Check if message contains urgent keywords
   */
  private checkUrgentKeywords(
    message: IMessage,
    rules: INotificationRule[]
  ): boolean {
    if (!rules || rules.length === 0) {
      return false;
    }

    const urgentKeywords = rules
      .filter(rule => rule.enabled)
      .flatMap(rule => rule.keywords)
      .filter(keyword => keyword.length > 0);

    if (urgentKeywords.length === 0) {
      return false;
    }

    const searchText = `${message.subject} ${message.content || ''}`.toLowerCase();

    return urgentKeywords.some(keyword =>
      searchText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if message meets priority threshold
   */
  private meetsPriorityThreshold(
    messagePriority: 'high' | 'medium' | 'low',
    rules: INotificationRule[]
  ): boolean {
    if (!rules || rules.length === 0) {
      // Default: send all notifications
      return true;
    }

    const enabledRule = rules.find(rule => rule.enabled);

    if (!enabledRule) {
      // No active rules, send all
      return true;
    }

    const threshold = enabledRule.priorityThreshold;
    const priorityValue = { high: 3, medium: 2, low: 1 };

    return priorityValue[messagePriority] >= priorityValue[threshold];
  }

  /**
   * Build notification payload for a message
   */
  async buildNotificationPayload(
    userId: string,
    message: IMessage,
    unreadCount?: number
  ): Promise<NotificationPayload> {
    // Truncate body for notification
    const bodyPreview = message.subject || message.content?.substring(0, 100) || '';

    return {
      userId,
      messageId: message._id.toString(),
      title: message.sender || message.sender,
      body: message.subject || '(No subject)',
      priority: message.priorityLevel,
      badge: unreadCount,
      data: {
        messageId: message._id.toString(),
        platform: message.platform,
        accountId: message.accountId.toString(),
        preview: bodyPreview,
        timestamp: message.timestamp.toISOString()
      }
    };
  }

  /**
   * Get queued notifications (those delayed by quiet hours)
   */
  async getQueuedNotifications(userId: string): Promise<IMessage[]> {
    // This would typically query a notifications queue table
    // For now, returning empty array as placeholder
    // A full implementation would need a NotificationQueue model
    return [];
  }

  /**
   * Check if quiet hours are ending soon (for batch processing)
   */
  isQuietHoursEndingSoon(quietHours?: IQuietHours, minutesThreshold: number = 5): boolean {
    if (!quietHours || !quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: quietHours.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const currentTime = formatter.format(now);
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const currentMinutes = currentHour * 60 + currentMinute;

    const [endHour, endMinute] = quietHours.endTime.split(':').map(Number);
    const endMinutes = endHour * 60 + endMinute;

    // Check if we're within threshold minutes of end time
    const minutesUntilEnd = endMinutes - currentMinutes;
    return minutesUntilEnd > 0 && minutesUntilEnd <= minutesThreshold;
  }
}

export const notificationService = new NotificationService();
