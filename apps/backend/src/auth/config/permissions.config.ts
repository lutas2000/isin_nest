import { PermissionType } from '../entities/user-feature.entity';

/**
 * 系統中可用的權限類型
 */
export const PERMISSION_TYPES = [
  {
    value: PermissionType.READ,
    label: '讀取',
    description: '擁有讀取資料的權限',
  },
  {
    value: PermissionType.WRITE,
    label: '寫入',
    description: '擁有讀取和寫入資料的權限（包含讀取權限）',
  },
  {
    value: PermissionType.PERSONAL,
    label: '個人',
    description: '只擁有個人資料的權限',
  },
] as const;

/**
 * 權限類型配置
 */
export interface PermissionTypeConfig {
  value: PermissionType;
  label: string;
  description: string;
}

/**
 * 獲取所有權限類型
 */
export function getPermissionTypes(): PermissionTypeConfig[] {
  return PERMISSION_TYPES.map((p) => ({ ...p }));
}

/**
 * 獲取權限類型的標籤
 */
export function getPermissionLabel(permission: PermissionType): string {
  const config = PERMISSION_TYPES.find((p) => p.value === permission);
  return config?.label || permission;
}

