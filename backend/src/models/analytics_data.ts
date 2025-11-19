import mongoose, { Schema, Document } from 'mongoose';

/**
 * Analytics Data Model
 * Task: T075 - Implement AnalyticsData model with time-series data
 *
 * Stores aggregated analytics data for efficient querying
 */

export type MetricType =
  | 'messages_received'
  | 'messages_read'
  | 'messages_replied'
  | 'response_time'
  | 'category_distribution'
  | 'platform_distribution';

export interface IAnalyticsData extends Document {
  userId: mongoose.Types.ObjectId;
  metricType: MetricType;
  date: Date;
  value: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const AnalyticsDataSchema = new Schema<IAnalyticsData>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  metricType: {
    type: String,
    enum: [
      'messages_received',
      'messages_read',
      'messages_replied',
      'response_time',
      'category_distribution',
      'platform_distribution'
    ],
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  value: {
    type: Number,
    required: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'analytics_data'
});

// Compound indexes for efficient queries
AnalyticsDataSchema.index({ userId: 1, metricType: 1, date: -1 });
AnalyticsDataSchema.index({ userId: 1, date: -1 });

// TTL index - keep analytics data for 1 year
AnalyticsDataSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const AnalyticsData = mongoose.model<IAnalyticsData>('AnalyticsData', AnalyticsDataSchema);
