import mongoose, { Schema, Document } from 'mongoose';

/**
 * Message Model
 * Task: T012 - Create Message model with fields per data-model.md
 * Reference: specs/001-ai-communication-hub/data-model.md
 */

export type Platform = 'gmail' | 'exchange' | 'imap' | 'facebook' | 'instagram' | 'whatsapp' | 'outlook_calendar';
export type PriorityLevel = 'high' | 'medium' | 'low';

export interface IAttachment {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url?: string;
}

export interface IMessage extends Document {
  userId: string;
  accountId: string;
  externalId: string;  // ID from the original platform
  platform: Platform;
  sender: string;
  recipient: string;
  subject?: string;
  content: string;
  from: string;  // Alias for sender (for auto-delete service compatibility)
  body: string;  // Alias for content (for auto-delete service compatibility)
  timestamp: Date;
  readStatus: boolean;
  priorityScore: number;  // 0-100
  priorityLevel: PriorityLevel;
  categoryId?: mongoose.Types.ObjectId;
  attachments: IAttachment[];
  isUrgent: boolean;
  metadata: Record<string, any>;  // Platform-specific data
  archivedAt?: Date;
  isTrashed: boolean;  // T062 - Auto-delete tracking
  trashedAt?: Date;    // T062 - Auto-delete tracking
  autoDeleted: boolean;  // T063 - Auto-delete tracking
  createdAt: Date;
  updatedAt: Date;

  // Methods
  markAsRead(status?: boolean): Promise<IMessage>;
  archive(): Promise<IMessage>;
  unarchive(): Promise<IMessage>;
  updatePriority(score: number, reasoning?: string): Promise<IMessage>;
  checkUrgency(): boolean;
}

const AttachmentSchema = new Schema<IAttachment>({
  id: { type: String, required: true },
  filename: { type: String, required: true },
  mimeType: { type: String, required: true },
  sizeBytes: { type: Number, required: true },
  url: { type: String }
}, { _id: false });

const MessageSchema = new Schema<IMessage>({
  userId: {
    type: String,
    required: true,
    index: true
  },
  accountId: {
    type: String,
    required: true,
    index: true
  },
  externalId: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    enum: ['gmail', 'exchange', 'imap', 'facebook', 'instagram', 'whatsapp', 'outlook_calendar'],
    required: true,
    index: true
  },
  sender: {
    type: String,
    required: true,
    index: true
  },
  recipient: {
    type: String,
    required: true
  },
  subject: {
    type: String
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  readStatus: {
    type: Boolean,
    default: false,
    index: true
  },
  priorityScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    index: true
  },
  priorityLevel: {
    type: String,
    enum: ['high', 'medium', 'low'],
    required: true,
    index: true
  },
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    index: true
  },
  attachments: [AttachmentSchema],
  isUrgent: {
    type: Boolean,
    default: false,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  archivedAt: {
    type: Date,
    index: true
  },
  isTrashed: {
    type: Boolean,
    default: false,
    index: true
  },
  trashedAt: {
    type: Date,
    index: true
  },
  autoDeleted: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  collection: 'messages'
});

// Compound indexes for common queries
MessageSchema.index({ accountId: 1, timestamp: -1 });
MessageSchema.index({ accountId: 1, readStatus: 1 });
MessageSchema.index({ accountId: 1, priorityLevel: 1 });
MessageSchema.index({ accountId: 1, categoryId: 1 });
MessageSchema.index({ platform: 1, externalId: 1 }, { unique: true });  // Prevent duplicates

// Full-text search index
MessageSchema.index({
  subject: 'text',
  content: 'text',
  sender: 'text'
}, {
  weights: {
    subject: 10,
    sender: 5,
    content: 1
  }
});

// Instance methods
MessageSchema.methods.markAsRead = async function(status: boolean = true): Promise<IMessage> {
  this.readStatus = status;
  return this.save();
};

MessageSchema.methods.archive = async function(): Promise<IMessage> {
  this.archivedAt = new Date();
  return this.save();
};

MessageSchema.methods.unarchive = async function(): Promise<IMessage> {
  this.archivedAt = undefined;
  return this.save();
};

MessageSchema.methods.updatePriority = async function(score: number, reasoning?: string): Promise<IMessage> {
  this.priorityScore = Math.max(0, Math.min(100, score));

  // Update priority level based on score
  if (score >= 70) {
    this.priorityLevel = 'high';
  } else if (score >= 40) {
    this.priorityLevel = 'medium';
  } else {
    this.priorityLevel = 'low';
  }

  // Store AI reasoning in metadata if provided
  if (reasoning) {
    this.metadata.aiReasoning = reasoning;
  }

  return this.save();
};

// Check for urgent keywords
MessageSchema.methods.checkUrgency = function(): boolean {
  const urgentKeywords = ['urgent', 'asap', 'important', 'critical', 'emergency'];
  const text = `${this.subject || ''} ${this.content}`.toLowerCase();
  return urgentKeywords.some(keyword => text.includes(keyword));
};

// Pre-save hook to set urgency
MessageSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('content') || this.isModified('subject')) {
    this.isUrgent = this.checkUrgency();
  }
  next();
});

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
