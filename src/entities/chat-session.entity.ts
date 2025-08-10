import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { MediaFile } from './media-file.entity';

@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column()
  userId: string;

  @Column()
  chatKey: string;

  @Column({ nullable: true })
  s3ChatFileKey?: string;

  @Column({ nullable: true })
  s3ChatFileUrl?: string;

  @OneToMany(() => MediaFile, (mediaFile) => mediaFile.chatSession)
  mediaFiles: MediaFile[];

  @Column({ default: 0 })
  messageCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
