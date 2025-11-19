import mongoose, { Schema, Document } from 'mongoose';

/**
 * Message Analysis Model
 * Task: T002 - Create MessageAnalysis model schema
 * Feature: 002-intelligent-message-analysis
 */

export type SentimentType = 'positive' | 'neutral' | 'negative';

export interface IMessageAnalysis extends Document {
  messageId: mongoose.Types.ObjectId;
  analysisTimestamp: Date;
  spamProbability: number;  // 0-100%
  isSpam: boolean;
  needsResponse: boolean;
  responseConfidence: number;  // 0-100%
  sentiment: SentimentType;
  priorityLevel: 'high' | 'medium' | 'low';
  generatedReplyText?: string;
  analysisVersion: string;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  shouldAutoDelete(threshold?: number): boolean;
  shouldAutoReply(threshold?: number): boolean;
}

const MessageAnalysisSchema = new Schema<IMessageAnalysis>({
  messageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: true,
    unique: true,  // One analysis per message
    index: true
  },
  analysisTimestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  spamProbability: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    index: true
  },
  isSpam: {
    type: Boolean,
    required: true,
    default: false,
    index: true
  },
  needsResponse: {
    type: Boolean,
    required: true,
    default: false,
    index: true
  },
  responseConfidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    index: true
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    required: true,
    default: 'neutral',
    index: true
  },
  priorityLevel: {
    type: String,
    enum: ['high', 'medium', 'low'],
    required: true,
    default: 'medium',
    index: true
  },
  generatedReplyText: {
    type: String
  },
  analysisVersion: {
    type: String,
    required: true,
    default: '1.0'
  }
}, {
  timestamps: true,
  collection: 'message_analyses'
});

// Compound indexes for common queries
MessageAnalysisSchema.index({ isSpam: 1, spamProbability: -1 });
MessageAnalysisSchema.index({ needsResponse: 1, responseConfidence: -1 });
MessageAnalysisSchema.index({ sentiment: 1, priorityLevel: 1 });

// Instance methods
MessageAnalysisSchema.methods.shouldAutoDelete = function(threshold: number = 80): boolean {
  return this.isSpam && this.spamProbability >= threshold;
};

MessageAnalysisSchema.methods.shouldAutoReply = function(threshold: number = 85): boolean {
  return this.needsResponse && this.responseConfidence >= threshold;
};

// Pre-save hook to set isSpam based on threshold
MessageAnalysisSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('spamProbability')) {
    this.isSpam = this.spamProbability >= 80;
  }
  next();
});

export const MessageAnalysis = mongoose.model<IMessageAnalysis>('MessageAnalysis', MessageAnalysisSchema);
