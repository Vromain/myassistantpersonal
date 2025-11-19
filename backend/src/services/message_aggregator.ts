import { Message, IMessage, PriorityLevel } from '../models/message';
import { ConnectedAccount } from '../models/connected_account';
import { Category } from '../models/category';
import { ollamaClient } from './ollama_client';
import mongoose from 'mongoose';

/**
 * Message Aggregator Service
 * Task: T022 - Create message aggregator for unified inbox across platforms
 * Reference: specs/001-ai-communication-hub/plan.md
 *
 * Provides unified access to messages from all connected platforms
 */

export interface MessageFilter {
  userId: string;
  platforms?: string[];
  priorityLevels?: PriorityLevel[];
  readStatus?: boolean;
  categoryId?: string;
  isUrgent?: boolean;
  searchQuery?: string;
  dateFrom?: Date;
  dateTo?: Date;
  archived?: boolean;
}

export interface MessageListOptions {
  page?: number;
  limit?: number;
  sortBy?: 'timestamp' | 'priorityScore' | 'sender';
  sortOrder?: 'asc' | 'desc';
}

export interface AggregatedMessageList {
  messages: IMessage[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  stats: {
    unreadCount: number;
    urgentCount: number;
    byPriority: {
      high: number;
      medium: number;
      low: number;
    };
    byPlatform: Record<string, number>;
  };
}

export class MessageAggregatorService {
  /**
   * Get unified message list across all platforms
   */
  async getMessages(
    filter: MessageFilter,
    options: MessageListOptions = {}
  ): Promise<AggregatedMessageList> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 50;
      const skip = (page - 1) * limit;
      const sortBy = options.sortBy || 'timestamp';
      const sortOrder = options.sortOrder || 'desc';

      // Get user's connected accounts
      const accounts = await ConnectedAccount.find({
        userId: filter.userId,
        ...(filter.platforms && { platform: { $in: filter.platforms } })
      }).select('_id');

      const accountIds = accounts.map(acc => acc._id);

      // Build query
      const query: any = {
        accountId: { $in: accountIds }
      };

      // Apply filters
      if (filter.priorityLevels && filter.priorityLevels.length > 0) {
        query.priorityLevel = { $in: filter.priorityLevels };
      }

      if (filter.readStatus !== undefined) {
        query.readStatus = filter.readStatus;
      }

      if (filter.categoryId) {
        query.categoryId = new mongoose.Types.ObjectId(filter.categoryId);
      }

      if (filter.isUrgent !== undefined) {
        query.isUrgent = filter.isUrgent;
      }

      if (filter.dateFrom || filter.dateTo) {
        query.timestamp = {};
        if (filter.dateFrom) {
          query.timestamp.$gte = filter.dateFrom;
        }
        if (filter.dateTo) {
          query.timestamp.$lte = filter.dateTo;
        }
      }

      if (filter.archived !== undefined) {
        if (filter.archived) {
          query.archivedAt = { $exists: true };
        } else {
          query.archivedAt = { $exists: false };
        }
      }

      // Full-text search
      if (filter.searchQuery) {
        query.$text = { $search: filter.searchQuery };
      }

      // Execute query with pagination
      const [messages, total] = await Promise.all([
        Message.find(query)
          .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
          .skip(skip)
          .limit(limit)
          .populate('categoryId', 'name color')
          .lean(),
        Message.countDocuments(query)
      ]);

      // Calculate stats
      // @ts-ignore - Type mismatch in Mongoose aggregation
      const stats = await this.calculateStats(accountIds, filter);

      return {
        // @ts-ignore - Mongoose document to interface conversion
        messages: messages as IMessage[],
        total,
        page,
        limit,
        hasMore: skip + messages.length < total,
        stats
      };
    } catch (error) {
      console.error('❌ Error aggregating messages:', error);
      throw error;
    }
  }

  /**
   * Calculate message statistics
   */
  private async calculateStats(
    accountIds: mongoose.Types.ObjectId[],
    filter: MessageFilter
  ): Promise<AggregatedMessageList['stats']> {
    const baseQuery: any = { accountId: { $in: accountIds } };

    if (filter.archived === false) {
      baseQuery.archivedAt = { $exists: false };
    }

    const [unreadCount, urgentCount, byPriority, byPlatformResults] = await Promise.all([
      // Unread count
      Message.countDocuments({
        ...baseQuery,
        readStatus: false
      }),

      // Urgent count
      Message.countDocuments({
        ...baseQuery,
        isUrgent: true
      }),

      // By priority
      Message.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$priorityLevel',
            count: { $sum: 1 }
          }
        }
      ]),

      // By platform
      Message.aggregate([
        { $match: baseQuery },
        {
          $lookup: {
            from: 'connected_accounts',
            localField: 'accountId',
            foreignField: '_id',
            as: 'account'
          }
        },
        { $unwind: '$account' },
        {
          $group: {
            _id: '$account.platform',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Transform priority stats
    const priorityStats = {
      high: 0,
      medium: 0,
      low: 0
    };

    byPriority.forEach((item: any) => {
      if (item._id in priorityStats) {
        priorityStats[item._id as PriorityLevel] = item.count;
      }
    });

    // Transform platform stats
    const platformStats: Record<string, number> = {};
    byPlatformResults.forEach((item: any) => {
      platformStats[item._id] = item.count;
    });

    return {
      unreadCount,
      urgentCount,
      byPriority: priorityStats,
      byPlatform: platformStats
    };
  }

  /**
   * Get single message by ID
   */
  async getMessage(messageId: string, userId: string): Promise<IMessage | null> {
    try {
      // Get user's account IDs
      const accounts = await ConnectedAccount.find({ userId }).select('_id');
      const accountIds = accounts.map(acc => acc._id);

      const message = await Message.findOne({
        _id: messageId,
        accountId: { $in: accountIds }
      }).populate('categoryId', 'name color');

      return message;
    } catch (error) {
      console.error('❌ Error getting message:', error);
      return null;
    }
  }

  /**
   * Mark message as read/unread
   */
  async updateReadStatus(
    messageId: string,
    userId: string,
    readStatus: boolean
  ): Promise<boolean> {
    try {
      const message = await this.getMessage(messageId, userId);

      if (!message) {
        return false;
      }

      await message.markAsRead(readStatus);
      return true;
    } catch (error) {
      console.error('❌ Error updating read status:', error);
      return false;
    }
  }

  /**
   * Archive/unarchive message
   */
  async archiveMessage(
    messageId: string,
    userId: string,
    archive: boolean = true
  ): Promise<boolean> {
    try {
      const message = await this.getMessage(messageId, userId);

      if (!message) {
        return false;
      }

      if (archive) {
        await message.archive();
      } else {
        message.archivedAt = undefined;
        await message.save();
      }

      return true;
    } catch (error) {
      console.error('❌ Error archiving message:', error);
      return false;
    }
  }

  /**
   * Categorize message using AI
   * Task: T060 - Track AI categorization for analytics
   */
  async categorizeMessage(messageId: string, userId: string): Promise<string | null> {
    try {
      const message = await this.getMessage(messageId, userId);

      if (!message) {
        return null;
      }

      // Get available categories for user
      const categories = await Category.find({
        $or: [
          { isPredefined: true },
          { userId: new mongoose.Types.ObjectId(userId) }
        ]
      });

      const categoryNames = categories.map(cat => cat.name);

      // Use AI to categorize
      const result = await ollamaClient.categorize(
        {
          subject: message.subject,
          content: message.content
        },
        categoryNames
      );

      // Find matching category
      const category = categories.find(cat => cat.name === result.category);

      if (category) {
        message.categoryId = category._id as mongoose.Types.ObjectId;
        await message.save();

        // Track analytics event (don't await to avoid blocking)
        const { aiAnalyticsService } = await import('./analytics/ai_analytics');
        aiAnalyticsService.logCategoryPredicted({
          userId,
          messageId,
          predictedCategory: category.name,
          confidence: result.confidence,
          model: ollamaClient.getModel()
        }).catch(err => console.error('Analytics tracking failed:', err));

        return category.name;
      }

      return null;
    } catch (error) {
      console.error('❌ Error categorizing message:', error);
      return null;
    }
  }

  /**
   * Batch categorize messages
   */
  async batchCategorizeMessages(userId: string, messageIds: string[]): Promise<number> {
    let categorized = 0;

    for (const messageId of messageIds) {
      const result = await this.categorizeMessage(messageId, userId);
      if (result) {
        categorized++;
      }
    }

    return categorized;
  }

  /**
   * Generate reply suggestions for a message
   * Task: T048 - Track AI reply generation for analytics
   */
  async generateReplies(messageId: string, userId: string): Promise<string[]> {
    const startTime = Date.now();

    try {
      const message = await this.getMessage(messageId, userId);

      if (!message) {
        return [];
      }

      // Get conversation history if available
      const conversationHistory = await Message.find({
        accountId: message.accountId,
        sender: message.sender
      })
        .sort({ timestamp: -1 })
        .limit(5)
        .select('content')
        .lean();

      const history = conversationHistory.map(msg => msg.content);

      // Generate replies using AI
      const replies = await ollamaClient.generateReplies(message.content, history);
      const responseTime = Date.now() - startTime;

      // Track analytics event (don't await to avoid blocking)
      const { aiAnalyticsService } = await import('./analytics/ai_analytics');
      aiAnalyticsService.logReplyGenerated({
        userId,
        messageId,
        suggestedReplies: replies,
        model: ollamaClient.getModel(),
        responseTime
      }).catch(err => console.error('Analytics tracking failed:', err));

      return replies;
    } catch (error) {
      console.error('❌ Error generating replies:', error);
      return [];
    }
  }

  /**
   * Get message thread (messages with same threadId)
   */
  async getThread(messageId: string, userId: string): Promise<IMessage[]> {
    try {
      const message = await this.getMessage(messageId, userId);

      if (!message || !message.metadata?.threadId) {
        return [message].filter(Boolean) as IMessage[];
      }

      // Get user's account IDs
      const accounts = await ConnectedAccount.find({ userId }).select('_id');
      const accountIds = accounts.map(acc => acc._id);

      const threadMessages = await Message.find({
        accountId: { $in: accountIds },
        'metadata.threadId': message.metadata.threadId
      })
        .sort({ timestamp: 1 })
        .populate('categoryId', 'name color');

      return threadMessages;
    } catch (error) {
      console.error('❌ Error getting thread:', error);
      return [];
    }
  }

  /**
   * Search messages with full-text search
   */
  async searchMessages(
    userId: string,
    searchQuery: string,
    options: MessageListOptions = {}
  ): Promise<AggregatedMessageList> {
    return this.getMessages(
      {
        userId,
        searchQuery,
        archived: false
      },
      options
    );
  }

  /**
   * Get unread messages count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const accounts = await ConnectedAccount.find({ userId }).select('_id');
      const accountIds = accounts.map(acc => acc._id);

      return await Message.countDocuments({
        accountId: { $in: accountIds },
        readStatus: false,
        archivedAt: { $exists: false }
      });
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Get urgent messages
   */
  async getUrgentMessages(userId: string): Promise<IMessage[]> {
    const result = await this.getMessages(
      {
        userId,
        isUrgent: true,
        readStatus: false,
        archived: false
      },
      {
        limit: 100,
        sortBy: 'priorityScore',
        sortOrder: 'desc'
      }
    );

    return result.messages;
  }

  /**
   * Bulk operations
   */
  async bulkMarkAsRead(userId: string, messageIds: string[]): Promise<number> {
    try {
      const accounts = await ConnectedAccount.find({ userId }).select('_id');
      const accountIds = accounts.map(acc => acc._id);

      const result = await Message.updateMany(
        {
          _id: { $in: messageIds },
          accountId: { $in: accountIds }
        },
        {
          readStatus: true
        }
      );

      return result.modifiedCount;
    } catch (error) {
      console.error('❌ Error bulk marking as read:', error);
      return 0;
    }
  }

  async bulkArchive(userId: string, messageIds: string[]): Promise<number> {
    try {
      const accounts = await ConnectedAccount.find({ userId }).select('_id');
      const accountIds = accounts.map(acc => acc._id);

      const result = await Message.updateMany(
        {
          _id: { $in: messageIds },
          accountId: { $in: accountIds }
        },
        {
          archivedAt: new Date()
        }
      );

      return result.modifiedCount;
    } catch (error) {
      console.error('❌ Error bulk archiving:', error);
      return 0;
    }
  }

  /**
   * Update message category (manual assignment)
   * @param messageId Message ID
   * @param userId User ID
   * @param categoryId Category ID (null to remove category)
   * @returns Updated message or null if not found
   */
  async updateMessageCategory(
    messageId: string,
    userId: string,
    categoryId?: string
  ): Promise<IMessage | null> {
    try {
      // Get user's connected accounts
      const accounts = await ConnectedAccount.find({
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (accounts.length === 0) {
        return null;
      }

      const accountIds = accounts.map(acc => acc._id);

      // Get the current message to check for existing category (T053, T060)
      const currentMessage = await Message.findOne({
        _id: new mongoose.Types.ObjectId(messageId),
        accountId: { $in: accountIds }
      }).populate('categoryId');

      if (!currentMessage) {
        return null;
      }

      // Verify new category exists and belongs to user (or is predefined)
      let newCategory = null;
      if (categoryId) {
        newCategory = await Category.findOne({
          _id: new mongoose.Types.ObjectId(categoryId),
          $or: [
            { isPredefined: true },
            { userId: new mongoose.Types.ObjectId(userId) }
          ]
        });

        if (!newCategory) {
          throw new Error('Category not found or unauthorized');
        }
      }

      // Check if this is a user correction (category was previously set and is being changed)
      const oldCategoryId = currentMessage.categoryId as any;
      if (oldCategoryId && categoryId && oldCategoryId.toString() !== categoryId) {
        // This is a correction - track it for analytics
        const oldCategory = await Category.findById(oldCategoryId);

        if (oldCategory && newCategory) {
          // Track correction for AI learning (T053, T060)
          const { aiAnalyticsService } = await import('./analytics/ai_analytics');
          aiAnalyticsService.logCategoryCorrected({
            userId,
            messageId,
            predictedCategory: oldCategory.name,
            actualCategory: newCategory.name
          }).catch(err => console.error('Analytics tracking failed:', err));
        }
      }

      // Update message
      const message = await Message.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(messageId),
          accountId: { $in: accountIds }
        },
        {
          categoryId: categoryId ? new mongoose.Types.ObjectId(categoryId) : undefined
        },
        { new: true }
      );

      return message;
    } catch (error) {
      console.error('❌ Error updating message category:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const messageAggregator = new MessageAggregatorService();
export default MessageAggregatorService;
