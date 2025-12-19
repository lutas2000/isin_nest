import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { FeaturePermission } from './feature-permission.entity';

@Entity('feature_configs')
export class FeatureConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  workGroup: string;

  @Column({ nullable: true })
  description: string;

  @OneToMany(() => FeaturePermission, (permission) => permission.featureConfig, {
    cascade: true,
  })
  permissions: FeaturePermission[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

