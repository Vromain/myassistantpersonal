import 'reflect-metadata';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { db } from '../db/connection';

export type SqlPlatform = 'gmail' | 'exchange' | 'imap' | 'facebook' | 'instagram' | 'whatsapp' | 'outlook_calendar';
export type SqlPriorityLevel = 'high' | 'medium' | 'low';

@Entity('messages')
export class MessageSql {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  @Index()
  userId!: string;

  @Column({ type: 'varchar' })
  @Index()
  accountId!: string;

  @Column({ type: 'varchar' })
  @Index()
  externalId!: string;

  @Column({ type: 'enum', enum: ['gmail', 'exchange', 'imap', 'facebook', 'instagram', 'whatsapp', 'outlook_calendar'] })
  @Index()
  platform!: SqlPlatform;

  @Column({ type: 'varchar' })
  @Index()
  sender!: string;

  @Column({ type: 'varchar' })
  recipient!: string;

  @Column({ type: 'varchar', nullable: true })
  subject?: string;

  @Column({ type: 'longtext' })
  content!: string;

  @Column({ type: 'datetime' })
  @Index()
  timestamp!: Date;

  @Column({ type: 'boolean', default: false })
  @Index()
  readStatus!: boolean;

  @Column({ type: 'int', default: 50 })
  @Index()
  priorityScore!: number;

  @Column({ type: 'enum', enum: ['high', 'medium', 'low'], default: 'medium' })
  @Index()
  priorityLevel!: SqlPriorityLevel;

  @Column({ type: 'varchar', nullable: true })
  categoryId?: string;

  @Column({ type: 'json', nullable: true })
  attachments?: Array<{ filename: string; mimeType: string; size: number; attachmentId?: string }>;

  @Column({ type: 'boolean', default: false })
  @Index()
  isUrgent!: boolean;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'datetime', nullable: true })
  @Index()
  archivedAt?: Date | null;

  @Column({ type: 'boolean', default: false })
  @Index()
  isSpam!: boolean;

  @Column({ type: 'int', default: 0 })
  @Index()
  spamProbability!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

export async function getMessageSqlRepo() {
  const ds = db.getConnection();
  return ds!.getRepository(MessageSql);
}
