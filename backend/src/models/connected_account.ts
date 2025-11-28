import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, In } from 'typeorm';
import { db } from '../db/connection';
import { User } from './user';
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

export interface IConnectedAccount {
  id: string;
  userId: string;
  platform: Platform;
  email?: string;
  displayName: string;
  oauthTokens: any;
  syncStatus: SyncStatus;
  lastSync?: Date;
  connectionHealth: ConnectionHealth;
  errorMessage?: string;
  syncSettings: ISyncSettings;
  imapConfig?: IImapConfig;  // For IMAP accounts
  createdAt: Date;
  updatedAt: Date;

  save(): Promise<ConnectedAccount>;
  deleteOne(): Promise<void>;

  // Methods
  encryptTokens(tokens: IOAuthTokens): string;
  decryptTokens(encrypted: string): IOAuthTokens;
  updateTokens(tokens: Partial<IOAuthTokens>): Promise<IConnectedAccount>;
  isTokenExpired(): boolean;
}

@Entity('connected_accounts')
export class ConnectedAccount implements IConnectedAccount {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  @Index()
  userId!: string;

  @ManyToOne(() => User, (user) => user.connectedAccounts)
  user?: User;

  @Column({ type: 'enum', enum: ['gmail', 'exchange', 'imap', 'facebook', 'instagram', 'whatsapp', 'outlook_calendar'] })
  platform!: Platform;

  @Column({ nullable: true })
  email?: string;

  @Column()
  displayName!: string;

  @Column({ type: 'text' })
  oauthTokens!: string;

  @Column({ type: 'enum', enum: ['active', 'syncing', 'error', 'disconnected', 'paused'], default: 'active' })
  syncStatus!: SyncStatus;

  @Column({ type: 'datetime', nullable: true })
  lastSync?: Date;

  @Column({ type: 'enum', enum: ['healthy', 'warning', 'error'], default: 'healthy' })
  connectionHealth!: ConnectionHealth;

  @Column({ nullable: true })
  errorMessage?: string;

  @Column({ type: 'json', nullable: false })
  syncSettings!: ISyncSettings;

  @Column({ type: 'json', nullable: true })
  imapConfig?: IImapConfig;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  encryptTokens(tokens: IOAuthTokens): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
      iv
    );
    let encrypted = cipher.update(JSON.stringify(tokens), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decryptTokens(encrypted: string): IOAuthTokens {
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
  }

  async updateTokens(tokens: Partial<IOAuthTokens>): Promise<ConnectedAccount> {
    let currentTokens: IOAuthTokens;
    try {
      currentTokens = this.decryptTokens(this.oauthTokens);
    } catch (_e) {
      currentTokens = { accessToken: '' } as IOAuthTokens;
    }
    const updatedTokens = { ...currentTokens, ...tokens } as IOAuthTokens;
    this.oauthTokens = this.encryptTokens(updatedTokens);
    const ds = db.getConnection();
    const repo = ds!.getRepository(ConnectedAccount);
    return repo.save(this);
  }

  isTokenExpired(): boolean {
    const tokens = this.decryptTokens(this.oauthTokens);
    if (!tokens.expiresAt) return false;
    return new Date() >= new Date(tokens.expiresAt);
  }

  static async findOne(params: Partial<{ userId: string; platform: Platform; email: string; id: string }>): Promise<ConnectedAccount | null> {
    const ds = db.getConnection();
    const repo = ds!.getRepository(ConnectedAccount);
    return repo.findOne({ where: params as any });
  }

  static async findById(id: string): Promise<ConnectedAccount | null> {
    const ds = db.getConnection();
    const repo = ds!.getRepository(ConnectedAccount);
    return repo.findOne({ where: { id } });
  }

  async save(): Promise<ConnectedAccount> {
    const ds = db.getConnection();
    const repo = ds!.getRepository(ConnectedAccount);
    return repo.save(this);
  }

  async deleteOne(): Promise<void> {
    const ds = db.getConnection();
    const repo = ds!.getRepository(ConnectedAccount);
    await repo.remove(this);
  }

  static create(data: Partial<ConnectedAccount>): ConnectedAccount {
    const a = new ConnectedAccount();
    Object.assign(a, data);
    if (!a.syncSettings) {
      a.syncSettings = { enabled: true, frequency: 300 };
    }
    return a;
  }

  static async find(filter: any): Promise<ConnectedAccount[]> {
    const ds = db.getConnection();
    const repo = ds!.getRepository(ConnectedAccount);
    const where: any = {};
    if (filter.userId) where.userId = filter.userId;
    if (filter.platform) where.platform = filter.platform;
    if (filter.email) where.email = filter.email;
    if (filter.id) where.id = filter.id;
    if (filter.syncStatus) where.syncStatus = filter.syncStatus;
    // Support basic $in for syncStatus
    if (filter.syncStatus && filter.syncStatus.$in) {
      where.syncStatus = In(filter.syncStatus.$in);
    }
    // Fetch all and then apply simple array-based filters if needed
    let results = await repo.find({ where: where } as any);
    if (filter.id && filter.id.$in) {
      const ids: string[] = filter.id.$in;
      results = results.filter(a => ids.includes(a.id));
    }
    return results;
  }
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'change-this-32-char-encryption-key!!';
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt OAuth tokens using AES-256
 * Security: FR-020 requires AES-256 encryption for stored credentials
 */
