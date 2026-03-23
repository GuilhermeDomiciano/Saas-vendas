import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LeadStatus } from './lead.enum';

@Entity()
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  businessName: string;

  @Column({ nullable: true })
  segment: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  googleMapsUrl: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ default: 0 })
  potentialScore: number;

  @Column({ default: LeadStatus.PROSPECTING })
  status: string;

  @Column({ nullable: true })
  whatsappLink: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
