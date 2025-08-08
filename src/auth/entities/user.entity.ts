import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Staff } from '../../hr/staff/entities/staff.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  userName: string;

  @Column()
  password: string;

  @Column({ default: false })
  isAdmin: boolean;

  @Column('simple-array', { default: '' })
  features: string[];

  @OneToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'staffId' })
  staff?: Staff;

  @Column({ nullable: true })
  staffId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
