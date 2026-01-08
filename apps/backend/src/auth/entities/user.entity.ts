import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Staff } from '../../hr/staff/entities/staff.entity';
import { UserFeature } from './user-feature.entity';

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

  @OneToMany(() => UserFeature, (userFeature) => userFeature.user, {
    cascade: true,
  })
  userFeatures: UserFeature[];

  @OneToOne(() => Staff, (staff) => staff.user)
  staff?: Staff;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
