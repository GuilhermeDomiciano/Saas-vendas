import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Lead } from '../leads/lead.entity';

export interface Message {
  role: 'ai' | 'client';
  content: string;
  timestamp: string;
}

@Entity()
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Lead, { eager: true, onDelete: 'CASCADE' })
  lead: Lead;

  @Column()
  strategy: string;

  @Column('jsonb', { default: [] })
  messages: Message[];

  @Column('text', { nullable: true, default: null })
  summary: string | null;

  @Column('int', { default: 0 })
  summarizedUpTo: number;

  @Column('text', { nullable: true, default: null })
  clientProfile: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
