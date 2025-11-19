import mongoose from 'mongoose';
import { Message } from '../../models/message';
import { AnalyticsData } from '../../models/analytics_data';

/**
 * Analytics Aggregator Service
 * Task: T070 - Implement analytics aggregation service
 *
 * Aggregates communication analytics for dashboard display
 */

export interface AnalyticsSummary {
  period: string;
  totalMessages: number;
  messagesRead: number;
  messagesReplied: number;
  avgResponseTime: number; // in hours
  readRate: number; // percentage
  replyRate: number; // percentage
}

export interface ResponseTimeMetrics {
  avgResponseTime: number; // in hours
  medianResponseTime: number;
  responseTimes: Array<{
    date: string;
    avgTime: number;
  }>;
}

export interface PlatformBreakdown {
  platform: string;
  count: number;
  percentage: number;
}

export interface TopContact {
  email: string;
  name: string;
  messageCount: number;
  lastInteraction: Date;
}

class AnalyticsAggregatorService {
  /**
   * Get analytics summary for a period
   */
  async getSummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsSummary> {
    const messages = await Message.find({
      accountId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: startDate, $lte: endDate }
    });

    const totalMessages = messages.length;
    const messagesRead = messages.filter(m => m.readStatus).length;

    // Count replied messages (those with a reply sent)
    const messagesReplied = messages.filter(m =>
      m.metadata?.replySent === true
    ).length;

    // Calculate average response time
    const responseTimes = messages
      .filter(m => m.metadata?.replySentAt && m.timestamp)
      .map(m => {
        const replySentAt = new Date(m.metadata!.replySentAt as string);
        const receivedAt = new Date(m.timestamp);
        return (replySentAt.getTime() - receivedAt.getTime()) / (1000 * 60 * 60); // hours
      });

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    const readRate = totalMessages > 0 ? (messagesRead / totalMessages) * 100 : 0;
    const replyRate = totalMessages > 0 ? (messagesReplied / totalMessages) * 100 : 0;

    return {
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      totalMessages,
      messagesRead,
      messagesReplied,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      readRate: Math.round(readRate * 10) / 10,
      replyRate: Math.round(replyRate * 10) / 10
    };
  }

  /**
   * Get response time metrics
   */
  async getResponseTimes(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ResponseTimeMetrics> {
    const messages = await Message.find({
      accountId: new mongoose.Types.ObjectId(userId),
      timestamp: { $gte: startDate, $lte: endDate },
      'metadata.replySentAt': { $exists: true }
    }).sort({ timestamp: 1 });

    const responseTimes = messages.map(m => {
      const replySentAt = new Date(m.metadata!.replySentAt as string);
      const receivedAt = new Date(m.timestamp);
      return {
        time: (replySentAt.getTime() - receivedAt.getTime()) / (1000 * 60 * 60), // hours
        date: receivedAt
      };
    });

    // Calculate average
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b.time, 0) / responseTimes.length
      : 0;

    // Calculate median
    const sortedTimes = responseTimes.map(rt => rt.time).sort((a, b) => a - b);
    const medianResponseTime = sortedTimes.length > 0
      ? sortedTimes[Math.floor(sortedTimes.length / 2)]
      : 0;

    // Group by day
    const timesByDay = new Map<string, number[]>();
    responseTimes.forEach(rt => {
      const dateKey = rt.date.toISOString().split('T')[0];
      if (!timesByDay.has(dateKey)) {
        timesByDay.set(dateKey, []);
      }
      timesByDay.get(dateKey)!.push(rt.time);
    });

    const responseTimes_ = Array.from(timesByDay.entries()).map(([date, times]) => ({
      date,
      avgTime: Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10
    }));

    return {
      avgResponseTime: Math.round(avgResponseTime * 10) / 10,
      medianResponseTime: Math.round(medianResponseTime * 10) / 10,
      responseTimes: responseTimes_
    };
  }

  /**
   * Get platform breakdown
   */
  async getPlatformBreakdown(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PlatformBreakdown[]> {
    const result = await Message.aggregate([
      {
        $match: {
          accountId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const total = result.reduce((sum, item) => sum + item.count, 0);

    return result.map(item => ({
      platform: item._id,
      count: item.count,
      percentage: total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0
    }));
  }

  /**
   * Get top contacts
   */
  async getTopContacts(
    userId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise<TopContact[]> {
    const result = await Message.aggregate([
      {
        $match: {
          accountId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$senderEmail',
          name: { $first: '$senderName' },
          messageCount: { $sum: 1 },
          lastInteraction: { $max: '$receivedAt' }
        }
      },
      {
        $sort: { messageCount: -1 }
      },
      {
        $limit: limit
      }
    ]);

    return result.map(item => ({
      email: item._id,
      name: item.name || item._id,
      messageCount: item.messageCount,
      lastInteraction: item.lastInteraction
    }));
  }

  /**
   * Get category distribution
   */
  async getCategoryDistribution(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ category: string; count: number; percentage: number }>> {
    const result = await Message.aggregate([
      {
        $match: {
          accountId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate, $lte: endDate },
          category: { $exists: true, $ne: null }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $unwind: '$categoryInfo'
      },
      {
        $group: {
          _id: '$categoryInfo.name',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const total = result.reduce((sum, item) => sum + item.count, 0);

    return result.map(item => ({
      category: item._id,
      count: item.count,
      percentage: total > 0 ? Math.round((item.count / total) * 1000) / 10 : 0
    }));
  }

  /**
   * Record analytics event (for time-series data)
   */
  async recordMetric(
    userId: string,
    metricType: string,
    value: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await AnalyticsData.create({
        userId: new mongoose.Types.ObjectId(userId),
        metricType,
        date: new Date(),
        value,
        metadata
      });

      console.log(`📊 Recorded metric: ${metricType} = ${value} for user ${userId}`);
    } catch (error) {
      console.error('❌ Failed to record metric:', error);
    }
  }
}

export const analyticsAggregator = new AnalyticsAggregatorService();
