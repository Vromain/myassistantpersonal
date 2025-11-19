import mongoose from 'mongoose';
import { AIEvent, IAIEvent } from '../../models/ai_event';

/**
 * AI Analytics Service
 * Task: T048 - Track AI reply acceptance rate for analytics
 * Task: T060 - Track AI categorization accuracy for analytics
 *
 * Tracks and aggregates AI performance metrics:
 * - Reply acceptance rate (SC-002: 40% target)
 * - Categorization accuracy (SC-003: 80% target)
 * - Priority scoring accuracy
 */

export interface ReplyAnalytics {
  totalGenerated: number;
  totalAccepted: number;
  totalRejected: number;
  acceptanceRate: number;
  avgResponseTime: number;
}

export interface CategorizationAnalytics {
  totalPredictions: number;
  totalCorrections: number;
  accuracy: number;
  avgConfidence: number;
}

export interface PriorityAnalytics {
  totalScored: number;
  totalAdjusted: number;
  avgDeviation: number;
}

class AIAnalyticsService {
  /**
   * Log AI reply generation event
   */
  async logReplyGenerated(data: {
    userId: string;
    messageId: string;
    suggestedReplies: string[];
    model: string;
    responseTime: number;
  }): Promise<void> {
    try {
      await AIEvent.create({
        userId: new mongoose.Types.ObjectId(data.userId),
        messageId: new mongoose.Types.ObjectId(data.messageId),
        eventType: 'reply_generated',
        suggestedReplies: data.suggestedReplies,
        aiModel: data.model,
        responseTime: data.responseTime
      });
    } catch (error) {
      console.error('❌ Failed to log reply generation:', error);
    }
  }

  /**
   * Log when user accepts an AI reply suggestion
   */
  async logReplyAccepted(data: {
    userId: string;
    messageId: string;
    selectedReply: string;
    finalReply?: string;
  }): Promise<void> {
    try {
      await AIEvent.create({
        userId: new mongoose.Types.ObjectId(data.userId),
        messageId: new mongoose.Types.ObjectId(data.messageId),
        eventType: 'reply_accepted',
        selectedReply: data.selectedReply,
        finalReply: data.finalReply || data.selectedReply
      });
    } catch (error) {
      console.error('❌ Failed to log reply acceptance:', error);
    }
  }

  /**
   * Log when user rejects AI reply suggestions
   */
  async logReplyRejected(data: {
    userId: string;
    messageId: string;
  }): Promise<void> {
    try {
      await AIEvent.create({
        userId: new mongoose.Types.ObjectId(data.userId),
        messageId: new mongoose.Types.ObjectId(data.messageId),
        eventType: 'reply_rejected'
      });
    } catch (error) {
      console.error('❌ Failed to log reply rejection:', error);
    }
  }

  /**
   * Log AI category prediction
   */
  async logCategoryPredicted(data: {
    userId: string;
    messageId: string;
    predictedCategory: string;
    confidence: number;
    model: string;
  }): Promise<void> {
    try {
      await AIEvent.create({
        userId: new mongoose.Types.ObjectId(data.userId),
        messageId: new mongoose.Types.ObjectId(data.messageId),
        eventType: 'category_predicted',
        predictedCategory: data.predictedCategory,
        confidence: data.confidence,
        aiModel: data.model
      });
    } catch (error) {
      console.error('❌ Failed to log category prediction:', error);
    }
  }

  /**
   * Log when user corrects AI category prediction
   * Task: T053 - AI learning from user corrections
   */
  async logCategoryCorrected(data: {
    userId: string;
    messageId: string;
    predictedCategory: string;
    actualCategory: string;
  }): Promise<void> {
    try {
      await AIEvent.create({
        userId: new mongoose.Types.ObjectId(data.userId),
        messageId: new mongoose.Types.ObjectId(data.messageId),
        eventType: 'category_corrected',
        predictedCategory: data.predictedCategory,
        actualCategory: data.actualCategory
      });
    } catch (error) {
      console.error('❌ Failed to log category correction:', error);
    }
  }

  /**
   * Get reply acceptance analytics for a date range
   * Returns metrics for SC-002 (40% acceptance rate target)
   */
  async getReplyAnalytics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ReplyAnalytics> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const query: any = { userId: userObjectId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const [generated, accepted, rejected] = await Promise.all([
      AIEvent.find({ ...query, eventType: 'reply_generated' }),
      AIEvent.countDocuments({ ...query, eventType: 'reply_accepted' }),
      AIEvent.countDocuments({ ...query, eventType: 'reply_rejected' })
    ]);

    const totalGenerated = generated.length;
    const totalAccepted = accepted;
    const totalRejected = rejected;

    // Calculate average response time
    const avgResponseTime =
      generated.reduce((sum, event) => sum + (event.responseTime || 0), 0) /
      (totalGenerated || 1);

    // Calculate acceptance rate
    const totalResponses = totalAccepted + totalRejected;
    const acceptanceRate = totalResponses > 0 ? totalAccepted / totalResponses : 0;

    return {
      totalGenerated,
      totalAccepted,
      totalRejected,
      acceptanceRate,
      avgResponseTime
    };
  }

  /**
   * Get categorization accuracy analytics
   * Returns metrics for SC-003 (80% accuracy target)
   */
  async getCategorizationAnalytics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CategorizationAnalytics> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const query: any = { userId: userObjectId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const [predictions, corrections] = await Promise.all([
      AIEvent.find({ ...query, eventType: 'category_predicted' }),
      AIEvent.countDocuments({ ...query, eventType: 'category_corrected' })
    ]);

    const totalPredictions = predictions.length;
    const totalCorrections = corrections;

    // Calculate accuracy (predictions - corrections) / predictions
    const accuracy = totalPredictions > 0
      ? (totalPredictions - totalCorrections) / totalPredictions
      : 0;

    // Calculate average confidence
    const avgConfidence =
      predictions.reduce((sum, event) => sum + (event.confidence || 0), 0) /
      (totalPredictions || 1);

    return {
      totalPredictions,
      totalCorrections,
      accuracy,
      avgConfidence
    };
  }

  /**
   * Get priority scoring analytics
   */
  async getPriorityAnalytics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PriorityAnalytics> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const query: any = { userId: userObjectId };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const [scored, adjusted] = await Promise.all([
      AIEvent.find({ ...query, eventType: 'priority_scored' }),
      AIEvent.find({ ...query, eventType: 'priority_adjusted' })
    ]);

    const totalScored = scored.length;
    const totalAdjusted = adjusted.length;

    // Calculate average deviation
    const avgDeviation =
      adjusted.reduce((sum, event) => {
        const predicted = event.predictedPriority || 0;
        const actual = event.actualPriority || 0;
        return sum + Math.abs(predicted - actual);
      }, 0) / (totalAdjusted || 1);

    return {
      totalScored,
      totalAdjusted,
      avgDeviation
    };
  }

  /**
   * Get combined AI analytics summary
   */
  async getAISummary(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    replies: ReplyAnalytics;
    categorization: CategorizationAnalytics;
    priority: PriorityAnalytics;
  }> {
    const [replies, categorization, priority] = await Promise.all([
      this.getReplyAnalytics(userId, startDate, endDate),
      this.getCategorizationAnalytics(userId, startDate, endDate),
      this.getPriorityAnalytics(userId, startDate, endDate)
    ]);

    return { replies, categorization, priority };
  }
}

export const aiAnalyticsService = new AIAnalyticsService();
