import mongoose, { Schema, Document } from 'mongoose';

/**
 * Device Token Model
 * Task: T063 - APNs integration
 *
 * Stores device tokens for push notifications
 */

export interface IDeviceToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId: string;
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceTokenSchema = new Schema<IDeviceToken>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    index: true
  },
  platform: {
    type: String,
    enum: ['ios', 'android', 'web'],
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastUsedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'device_tokens'
});

// Compound index for unique device per user
DeviceTokenSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

// Index for cleanup queries
DeviceTokenSchema.index({ lastUsedAt: 1, isActive: 1 });

export const DeviceToken = mongoose.model<IDeviceToken>('DeviceToken', DeviceTokenSchema);
