import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { db } from '../db/connection';
import { ConnectedAccount } from './connected_account';

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

export interface IUser {
  id: string;
  email: string;
  password?: string;
  displayName?: string;
  subscriptionTier: 'free' | 'premium';
  preferences: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  connectedAccounts?: ConnectedAccount[];
}

@Entity('users')
export class User implements IUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true, select: false })
  password?: string;

  @Column({ nullable: true })
  displayName?: string;

  @Column({ type: 'enum', enum: ['free', 'premium'], default: 'free' })
  subscriptionTier!: 'free' | 'premium';

  @Column({ type: 'json', nullable: false })
  preferences!: IUserPreferences;

  @Column({ type: 'datetime', nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => ConnectedAccount, (account) => account.user)
  connectedAccounts?: ConnectedAccount[];

  async save(): Promise<User> {
    const ds = db.getConnection();
    const repo = ds!.getRepository(User);
    return repo.save(this);
  }

  async updateLastLogin(): Promise<User> {
    this.lastLoginAt = new Date();
    return this.save();
  }

  async canAddAccount(): Promise<boolean> {
    const maxAccounts = this.subscriptionTier === 'premium' ? 10 : 5;
    const ds = db.getConnection();
    const count = await ds!.getRepository(ConnectedAccount).count({ where: { userId: this.id } });
    return count < maxAccounts;
  }

  get accountLimit(): number {
    return this.subscriptionTier === 'premium' ? 10 : 5;
  }

  static async findById(id: string): Promise<User | null> {
    const ds = db.getConnection();
    const repo = ds!.getRepository(User);
    return repo.findOne({ where: { id } });
  }

  static async findOne(params: Partial<Pick<User, 'email'>>): Promise<User | null> {
    const ds = db.getConnection();
    const repo = ds!.getRepository(User);
    return repo.findOne({ where: params as any });
  }

  static async findOneWithPassword(email: string): Promise<User | null> {
    const ds = db.getConnection();
    const repo = ds!.getRepository(User);
    return repo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  static create(data: Partial<User>): User {
    const u = new User();
    Object.assign(u, data);
    if (!u.preferences) {
      u.preferences = {
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '07:00',
          timezone: 'UTC'
        },
        notificationRules: [],
        dataRetentionDays: 90
      };
    }
    return u;
  }
}
