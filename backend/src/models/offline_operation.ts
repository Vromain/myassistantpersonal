import mongoose, { Document, Schema } from 'mongoose';

/**
 * Offline Operation Model
 * Task: T084 - Add offline mode with queued message sync
 *
 * Stores operations performed while offline for later synchronization
 * Enables queue-based sync when connection is restored
 */

export type OperationType =
  | 'mark_read'
  | 'mark_unread'
  | 'archive'
  | 'unarchive'
  | 'categorize'
  | 'send_reply'
  | 'delete';

export interface IOfflineOperation extends Document {
  userId: mongoose.Types.ObjectId;
  operationType: OperationType;

  // Target resource
  resourceType: 'message' | 'category' | 'account';
  resourceId?: string; // May not exist yet for new resources

  // Operation data
  data: Record<string, any>;

  // Status tracking
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  lastError?: string;

  // Timing
  createdAt: Date;
  scheduledFor?: Date; // For delayed operations
  processedAt?: Date;

  // Priority (higher = more urgent)
  priority: number;

  // Client metadata
  clientId?: string; // To track which device created the operation
  clientTimestamp?: Date;
}

const offlineOperationSchema = new Schema<IOfflineOperation>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  operationType: {
    type: String,
    required: true,
    enum: ['mark_read', 'mark_unread', 'archive', 'unarchive', 'categorize', 'send_reply', 'delete'],
    index: true
  },

  // Target resource
  resourceType: {
    type: String,
    required: true,
    enum: ['message', 'category', 'account']
  },
  resourceId: {
    type: String,
    required: false
  },

  // Operation data
  data: {
    type: Schema.Types.Mixed,
    required: true
  },

  // Status tracking
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  retryCount: {
    type: Number,
    required: true,
    default: 0
  },
  maxRetries: {
    type: Number,
    required: true,
    default: 3
  },
  lastError: {
    type: String,
    required: false
  },

  // Timing
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  scheduledFor: {
    type: Date,
    required: false
  },
  processedAt: {
    type: Date,
    required: false
  },

  // Priority
  priority: {
    type: Number,
    required: true,
    default: 5, // 1-10 scale, 10 = highest
    index: true
  },

  // Client metadata
  clientId: {
    type: String,
    required: false
  },
  clientTimestamp: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
offlineOperationSchema.index({ userId: 1, status: 1, priority: -1, createdAt: 1 });
offlineOperationSchema.index({ userId: 1, clientId: 1, status: 1 });

// TTL index - auto-delete completed/failed operations after 30 days
offlineOperationSchema.index(
  { processedAt: 1 },
  {
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
    partialFilterExpression: { status: { $in: ['completed', 'failed'] } }
  }
);

// Virtual for whether operation can be retried
offlineOperationSchema.virtual('canRetry').get(function() {
  return this.status === 'failed' && this.retryCount < this.maxRetries;
});

// Virtual for operation age
offlineOperationSchema.virtual('ageMs').get(function() {
  return Date.now() - this.createdAt.getTime();
});

export const OfflineOperation = mongoose.model<IOfflineOperation>(
  'OfflineOperation',
  offlineOperationSchema
);
