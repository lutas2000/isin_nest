import { SetMetadata } from '@nestjs/common';
import { PermissionType } from '../entities/user-feature.entity';

export const FEATURE_PERMISSION_KEY = 'feature_permission';

export interface FeaturePermissionMetadata {
  feature: string;
  permission: PermissionType;
}

export const RequireFeature = (
  feature: string,
  permission: PermissionType = PermissionType.READ,
) => SetMetadata(FEATURE_PERMISSION_KEY, { feature, permission });

