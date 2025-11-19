import mongoose, { Schema, Document } from 'mongoose';

/**
 * User Settings Model
 * Task: T003 - Create UserSettings model schema
 * Feature: 002-intelligent-message-analysis
 */

export interface IAutoReplyConditions {
  senderWhitelist: string[];
  senderBlacklist: string[];
  businessHoursOnly: boolean;
  maxRepliesPerDay: number;
}

export interface IUserSettings extends Document {
  userId: mongoose.Types.ObjectId;
  autoDeleteSpamEnabled: boolean;
  autoSendRepliesEnabled: boolean;
  autoReplyConditions: IAutoReplyConditions;
  spamThreshold: number;  // 0-100%, default 80
  responseConfidenceThreshold: number;  // 0-100%, default 85
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  canAutoDelete(): boolean;
  canAutoReply(sender?: string): boolean;
  isBusinessHours(): boolean;
}

const AutoReplyConditionsSchema = new Schema<IAutoReplyConditions>({
  senderWhitelist: {
    type: [String],
    default: []
  },
  senderBlacklist: {
    type: [String],
    default: []
  },
  businessHoursOnly: {
    type: Boolean,
    default: false
  },
  maxRepliesPerDay: {
    type: Number,
    default: 50,
    min: 0,
    max: 1000
  }
}, { _id: false });

const UserSettingsSchema = new Schema<IUserSettings>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,  // One settings document per user
    index: true
  },
  autoDeleteSpamEnabled: {
    type: Boolean,
    default: false,
    required: true
  },
  autoSendRepliesEnabled: {
    type: Boolean,
    default: false,
    required: true
  },
  autoReplyConditions: {
    type: AutoReplyConditionsSchema,
    default: () => ({
      senderWhitelist: [],
      senderBlacklist: [],
      businessHoursOnly: false,
      maxRepliesPerDay: 50
    })
  },
  spamThreshold: {
    type: Number,
    default: 80,
    min: 0,
    max: 100
  },
  responseConfidenceThreshold: {
    type: Number,
    default: 85,
    min: 0,
    max: 100
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'user_settings'
});

// Indexes
UserSettingsSchema.index({ userId: 1 });
UserSettingsSchema.index({ autoDeleteSpamEnabled: 1 });
UserSettingsSchema.index({ autoSendRepliesEnabled: 1 });

// Instance methods
UserSettingsSchema.methods.canAutoDelete = function(): boolean {
  return this.autoDeleteSpamEnabled;
};

UserSettingsSchema.methods.canAutoReply = function(sender?: string): boolean {
  if (!this.autoSendRepliesEnabled) {
    return false;
  }

  // Check whitelist/blacklist
  if (sender) {
    const senderEmail = sender.toLowerCase();

    // If blacklisted, cannot auto-reply
    if (this.autoReplyConditions.senderBlacklist.some(email =>
      senderEmail.includes(email.toLowerCase())
    )) {
      return false;
    }

    // If whitelist is not empty and sender not in whitelist, cannot auto-reply
    if (this.autoReplyConditions.senderWhitelist.length > 0) {
      const inWhitelist = this.autoReplyConditions.senderWhitelist.some(email =>
        senderEmail.includes(email.toLowerCase())
      );
      if (!inWhitelist) {
        return false;
      }
    }
  }

  // Check business hours if required
  if (this.autoReplyConditions.businessHoursOnly && !this.isBusinessHours()) {
    return false;
  }

  return true;
};

UserSettingsSchema.methods.isBusinessHours = function(): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = now.getHours();

  // Monday-Friday (1-5), 9 AM - 5 PM
  return dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour < 17;
};

// Pre-save hook to update lastUpdated
UserSettingsSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

export const UserSettings = mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);
