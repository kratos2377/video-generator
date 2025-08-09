import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ChatSession } from './chat-session.entity';
import { Script } from './script.entity';
import { Scene } from './scene.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ unique: true })
  googleId: string;

  @Column({ default: 'google' })
  provider: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Script, (script) => script.user)
  scripts: Script[];

  @OneToMany(() => Scene, (scene) => scene.user)
  scenes: Scene[];
}
