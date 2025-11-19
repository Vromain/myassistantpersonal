import mongoose, { Document, Schema } from 'mongoose';

/**
 * AI Event Model
 * Task: T048 - Track AI reply acceptance rate for analytics
 *
 * Tracks AI interactions for analytics purposes:
 * - Reply suggestions generated and accepted/rejected
 * - Categorization predictions and user corrections
 * - Priority scoring adjustments
 */

export interface IAIEvent extends Document {
  userId: mongoose.Types.ObjectId;
  messageId: mongoose.Types.ObjectId;
  eventType: 'reply_generated' | 'reply_accepted' | 'reply_rejected' |
             'category_predicted' | 'category_corrected' |
             'priority_scored' | 'priority_adjusted';

  // For reply events
  suggestedReplies?: string[];
  selectedReply?: string;
  finalReply?: string;

  // For category events
  predictedCategory?: string;
  actualCategory?: string;
  confidence?: number;

  // For priority events
  predictedPriority?: number;
  actualPriority?: number;

  // Metadata
  aiModel?: string; // Renamed from 'model' to avoid conflict with mongoose Document.model
  responseTime?: number; // milliseconds
  createdAt: Date;
}

const aiEventSchema = new Schema<IAIEvent>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  messageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'reply_generated',
      'reply_accepted',
      'reply_rejected',
      'category_predicted',
      'category_corrected',
      'priority_scored',
      'priority_adjusted'
    ],
    index: true
  },

  // Reply event fields
  suggestedReplies: {
    type: [String],
    required: false
  },
  selectedReply: {
    type: String,
    required: false
  },
  finalReply: {
    type: String,
    required: false
  },

  // Category event fields
  predictedCategory: {
    type: String,
    required: false
  },
  actualCategory: {
    type: String,
    required: false
  },
  confidence: {
    type: Number,
    required: false,
    min: 0,
    max: 1
  },

  // Priority event fields
  predictedPriority: {
    type: Number,
    required: false,
    min: 0,
    max: 100
  },
  actualPriority: {
    type: Number,
    required: false,
    min: 0,
    max: 100
  },

  // Metadata
  aiModel: {
    type: String,
    required: false
  },
  responseTime: {
    type: Number,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for analytics queries
aiEventSchema.index({ userId: 1, eventType: 1, createdAt: -1 });
aiEventSchema.index({ messageId: 1, eventType: 1 });

export const AIEvent = mongoose.model<IAIEvent>('AIEvent', aiEventSchema);
