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
import { Scene } from './scene.entity';

@Entity('scripts')
export class Script {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any;

  @Column({ type: 'text', nullable: true })
  genre?: string;

  @Column({ type: 'text', nullable: true })
  synopsis?: string;

  @ManyToOne(() => User, (user) => user.scripts)
  user: User;

  @Column()
  userId: string;

  @OneToMany(() => Scene, (scene) => scene.script)
  scenes: Scene[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
