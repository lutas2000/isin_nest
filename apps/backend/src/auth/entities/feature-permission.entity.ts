import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  JoinColumn,
} from 'typeorm';
import { FeatureConfig } from './feature-config.entity';
import { Feature } from './feature.entity';
import { PermissionType } from './user-feature.entity';

@Entity('feature_permissions')
@Unique(['featureConfig', 'feature'])
export class FeaturePermission {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => FeatureConfig, (config) => config.permissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'featureConfigId' })
  featureConfig: FeatureConfig;

  @ManyToOne(() => Feature, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'featureId' })
  feature: Feature;

  @Column({
    type: 'enum',
    enum: PermissionType,
    default: PermissionType.READ,
  })
  permission: PermissionType;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

