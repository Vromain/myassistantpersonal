import mongoose, { Document, Schema } from 'mongoose';

/**
 * Sync Progress Model
 * Task: T082 - Handle large message imports with progress indicator
 *
 * Tracks the progress of message synchronization operations
 * Allows clients to monitor long-running sync jobs
 */

export interface ISyncProgress extends Document {
  userId: mongoose.Types.ObjectId;
  accountId: mongoose.Types.ObjectId;
  syncId: string; // Unique identifier for this sync operation

  // Progress tracking
  status: 'pending' | 'syncing' | 'completed' | 'failed' | 'cancelled';
  totalMessages: number;
  processedMessages: number;
  storedMessages: number;
  failedMessages: number;

  // Timing
  startedAt: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number; // milliseconds

  // Error tracking
  syncErrors: Array<{ // Renamed from 'errors' to avoid conflict with mongoose Document
    messageId?: string;
    error: string;
    timestamp: Date;
  }>;

  // Current operation details
  currentBatch: number;
  totalBatches: number;
  batchSize: number;

  // Metadata
  syncType: 'initial' | 'incremental' | 'full';
  createdAt: Date;
  updatedAt: Date;
}

const syncProgressSchema = new Schema<ISyncProgress>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  accountId: {
    type: Schema.Types.ObjectId,
    ref: 'ConnectedAccount',
    required: true,
    index: true
  },
  syncId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Progress tracking
  status: {
    type: String,
    required: true,
    enum: ['pending', 'syncing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  totalMessages: {
    type: Number,
    required: true,
    default: 0
  },
  processedMessages: {
    type: Number,
    required: true,
    default: 0
  },
  storedMessages: {
    type: Number,
    required: true,
    default: 0
  },
  failedMessages: {
    type: Number,
    required: true,
    default: 0
  },

  // Timing
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  completedAt: {
    type: Date,
    required: false
  },
  estimatedTimeRemaining: {
    type: Number,
    required: false
  },

  // Error tracking
  syncErrors: [{
    messageId: String,
    error: String,
    timestamp: { type: Date, default: Date.now }
  }],

  // Batch info
  currentBatch: {
    type: Number,
    required: true,
    default: 0
  },
  totalBatches: {
    type: Number,
    required: true,
    default: 0
  },
  batchSize: {
    type: Number,
    required: true,
    default: 50 // Process messages in batches of 50
  },

  // Metadata
  syncType: {
    type: String,
    required: true,
    enum: ['initial', 'incremental', 'full'],
    default: 'incremental'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
syncProgressSchema.index({ userId: 1, status: 1, createdAt: -1 });
syncProgressSchema.index({ accountId: 1, status: 1, createdAt: -1 });

// TTL index - auto-delete completed syncs after 7 days
syncProgressSchema.index(
  { completedAt: 1 },
  {
    expireAfterSeconds: 7 * 24 * 60 * 60, // 7 days
    partialFilterExpression: { status: { $in: ['completed', 'failed', 'cancelled'] } }
  }
);

// Virtual for progress percentage
syncProgressSchema.virtual('progressPercentage').get(function() {
  if (this.totalMessages === 0) return 0;
  return Math.round((this.processedMessages / this.totalMessages) * 100);
});

// Virtual for success rate
syncProgressSchema.virtual('successRate').get(function() {
  if (this.processedMessages === 0) return 0;
  return Math.round((this.storedMessages / this.processedMessages) * 100);
});

export const SyncProgress = mongoose.model<ISyncProgress>('SyncProgress', syncProgressSchema);
