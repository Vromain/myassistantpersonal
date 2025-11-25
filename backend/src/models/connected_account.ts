import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

/**
 * ConnectedAccount Model
 * Task: T011 - Create ConnectedAccount model with OAuth token storage (encrypted)
 * Reference: specs/001-ai-communication-hub/data-model.md
 */

export type Platform = 'gmail' | 'exchange' | 'imap' | 'facebook' | 'instagram' | 'whatsapp' | 'outlook_calendar';
export type SyncStatus = 'active' | 'syncing' | 'error' | 'disconnected' | 'paused';
export type ConnectionHealth = 'healthy' | 'warning' | 'error';

export interface IOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string[];
}

export interface ISyncSettings {
  enabled: boolean;
  frequency: number;  // Sync frequency in seconds
  syncFrom?: Date;    // Start syncing from this date
}

export interface IImapConfig {
  host: string;
  port: number;
  secure: boolean;
}

export interface IConnectedAccount extends Document {
  userId: mongoose.Types.ObjectId;
  platform: Platform;
  email?: string;
  displayName: string;
  oauthTokens: IOAuthTokens;  // Encrypted in database
  syncStatus: SyncStatus;
  lastSync?: Date;
  connectionHealth: ConnectionHealth;
  errorMessage?: string;
  syncSettings: ISyncSettings;
  imapConfig?: IImapConfig;  // For IMAP accounts
  createdAt: Date;
  updatedAt: Date;

  // Methods
  encryptTokens(tokens: IOAuthTokens): string;
  decryptTokens(encrypted: string): IOAuthTokens;
  updateTokens(tokens: Partial<IOAuthTokens>): Promise<IConnectedAccount>;
  isTokenExpired(): boolean;
}

const ConnectedAccountSchema = new Schema<IConnectedAccount>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  platform: {
    type: String,
    enum: ['gmail', 'exchange', 'imap', 'facebook', 'instagram', 'whatsapp', 'outlook_calendar'],
    required: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true
  },
  oauthTokens: {
    type: String,  // Stored as encrypted JSON string
    required: true
  },
  syncStatus: {
    type: String,
    enum: ['active', 'syncing', 'error', 'disconnected', 'paused'],
    default: 'active'
  },
  lastSync: {
    type: Date
  },
  connectionHealth: {
    type: String,
    enum: ['healthy', 'warning', 'error'],
    default: 'healthy'
  },
  errorMessage: {
    type: String
  },
  syncSettings: {
    enabled: {
      type: Boolean,
      default: true
    },
    frequency: {
      type: Number,
      default: 300  // 5 minutes
    },
    syncFrom: {
      type: Date
    }
  },
  imapConfig: {
    host: {
      type: String
    },
    port: {
      type: Number
    },
    secure: {
      type: Boolean
    }
  }
}, {
  timestamps: true,
  collection: 'connected_accounts'
});

// Indexes
ConnectedAccountSchema.index({ userId: 1, platform: 1 });
ConnectedAccountSchema.index({ syncStatus: 1 });
ConnectedAccountSchema.index({ connectionHealth: 1 });
ConnectedAccountSchema.index({ lastSync: -1 });

// Encryption helpers
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'change-this-32-char-encryption-key!!';
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt OAuth tokens using AES-256
 * Security: FR-020 requires AES-256 encryption for stored credentials
 */
ConnectedAccountSchema.methods.encryptTokens = function(tokens: IOAuthTokens): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
    iv
  );

  let encrypted = cipher.update(JSON.stringify(tokens), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return iv.toString('hex') + ':' + encrypted;
};

/**
 * Decrypt OAuth tokens
 */
ConnectedAccountSchema.methods.decryptTokens = function(encrypted: string): IOAuthTokens {
  try {
    if (!encrypted || !encrypted.includes(':')) {
      return { accessToken: '' } as IOAuthTokens;
    }

    const parts = encrypted.split(':');
    const ivHex = parts[0];
    const encryptedText = parts[1];

    const iv = Buffer.from(ivHex, 'hex');
    if (iv.length !== 16) {
      return { accessToken: '' } as IOAuthTokens;
    }

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
      iv
    );

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const obj = JSON.parse(decrypted);
    if (!obj.accessToken) obj.accessToken = '';
    return obj as IOAuthTokens;
  } catch (_e) {
    return { accessToken: '' } as IOAuthTokens;
  }
};

/**
 * Update OAuth tokens securely
 */
ConnectedAccountSchema.methods.updateTokens = async function(
  tokens: Partial<IOAuthTokens>
): Promise<IConnectedAccount> {
  let currentTokens: IOAuthTokens;
  try {
    currentTokens = this.decryptTokens(this.oauthTokens);
  } catch (_e) {
    currentTokens = { accessToken: '' } as IOAuthTokens;
  }
  const updatedTokens = { ...currentTokens, ...tokens } as IOAuthTokens;
  this.oauthTokens = this.encryptTokens(updatedTokens);
  return this.save();
};

/**
 * Check if access token is expired
 */
ConnectedAccountSchema.methods.isTokenExpired = function(): boolean {
  const tokens = this.decryptTokens(this.oauthTokens);
  if (!tokens.expiresAt) return false;
  return new Date() >= new Date(tokens.expiresAt);
};

// Virtual to get decrypted tokens (use carefully)
ConnectedAccountSchema.virtual('tokens').get(function() {
  return (this as any).decryptTokens(this.oauthTokens);
});

// Pre-save hook to ensure tokens are encrypted
ConnectedAccountSchema.pre('save', function(next) {
  if (this.isModified('oauthTokens') && typeof this.oauthTokens === 'object') {
    this.oauthTokens = (this as any).encryptTokens(this.oauthTokens);
  }
  next();
});

export const ConnectedAccount = mongoose.model<IConnectedAccount>('ConnectedAccount', ConnectedAccountSchema);
