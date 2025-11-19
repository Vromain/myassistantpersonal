import mongoose, { Schema, Document } from 'mongoose';

/**
 * User Model
 * Task: T010 - Create User model with fields: id, email, preferences, subscription_tier, created_at
 * Reference: specs/001-ai-communication-hub/data-model.md
 */

export interface IQuietHours {
  enabled: boolean;
  startTime: string;  // Format: "HH:MM"
  endTime: string;    // Format: "HH:MM"
  timezone: string;   // e.g., "America/New_York"
}

export interface INotificationRule {
  priorityThreshold: 'high' | 'medium' | 'low';
  enabled: boolean;
  keywords: string[];
}

export interface IUserPreferences {
  quietHours?: IQuietHours;
  notificationRules: INotificationRule[];
  dataRetentionDays: number;  // 30, 90, 180, or 365
}

export interface IUser extends Document {
  email: string;
  password?: string;  // Optional - for local auth, not needed for OAuth only
  displayName?: string;  // Display name for the user
  subscriptionTier: 'free' | 'premium';
  preferences: IUserPreferences;
  connectedAccounts: mongoose.Types.ObjectId[];  // References to ConnectedAccount
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

const QuietHoursSchema = new Schema<IQuietHours>({
  enabled: { type: Boolean, default: false },
  startTime: { type: String, default: '22:00' },
  endTime: { type: String, default: '07:00' },
  timezone: { type: String, default: 'UTC' }
}, { _id: false });

const NotificationRuleSchema = new Schema<INotificationRule>({
  priorityThreshold: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  enabled: { type: Boolean, default: true },
  keywords: [{ type: String }]
}, { _id: false });

const UserPreferencesSchema = new Schema<IUserPreferences>({
  quietHours: { type: QuietHoursSchema },
  notificationRules: [NotificationRuleSchema],
  dataRetentionDays: {
    type: Number,
    default: 90,
    enum: [30, 90, 180, 365]
  }
}, { _id: false });

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },
  password: {
    type: String,
    select: false  // Don't include password in queries by default (for security)
  },
  displayName: {
    type: String
  },
  subscriptionTier: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  preferences: {
    type: UserPreferencesSchema,
    default: () => ({
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '07:00',
        timezone: 'UTC'
      },
      notificationRules: [],
      dataRetentionDays: 90
    })
  },
  connectedAccounts: [{
    type: Schema.Types.ObjectId,
    ref: 'ConnectedAccount'
  }],
  lastLoginAt: {
    type: Date
  }
}, {
  timestamps: true,  // Automatically adds createdAt and updatedAt
  collection: 'users'
});

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ subscriptionTier: 1 });

// Instance methods
UserSchema.methods.updateLastLogin = function() {
  this.lastLoginAt = new Date();
  return this.save();
};

UserSchema.methods.canAddAccount = function(): boolean {
  const maxAccounts = this.subscriptionTier === 'premium' ? 10 : 5;
  return this.connectedAccounts.length < maxAccounts;
};

// Virtual for account limit
UserSchema.virtual('accountLimit').get(function() {
  return this.subscriptionTier === 'premium' ? 10 : 5;
});

// Export model
export const User = mongoose.model<IUser>('User', UserSchema);
