import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Feature } from './feature.entity';

export enum PermissionType {
  READ = 'read',
  WRITE = 'write',
}

@Entity('user_features')
@Unique(['user', 'feature'])
export class UserFeature {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.userFeatures, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Feature, (feature) => feature.userFeatures, {
    onDelete: 'CASCADE',
  })
  feature: Feature;

  @Column({
    type: 'enum',
    enum: PermissionType,
    default: PermissionType.READ,
  })
  permission: PermissionType;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

