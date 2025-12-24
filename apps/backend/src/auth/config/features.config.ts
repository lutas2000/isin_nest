/**
 * 系統中可用的功能列表
 * 格式：模組-子功能，例如 crm-customer, hr-staff
 */
export interface FeatureConfig {
  name: string;
  label: string;
  description: string;
  module: string;
  category: string;
}

/**
 * 所有可用的功能列表
 */
export const FEATURES: FeatureConfig[] = [
  // CRM 模組
  {
    name: 'crm-customer',
    label: '客戶管理',
    description: '管理客戶資料',
    module: 'crm',
    category: 'customer',
  },
  {
    name: 'crm-contact',
    label: '聯絡人管理',
    description: '管理客戶聯絡人資料',
    module: 'crm',
    category: 'contact',
  },
  {
    name: 'crm-quote',
    label: '報價單管理',
    description: '管理報價單資料',
    module: 'crm',
    category: 'quote',
  },
  {
    name: 'crm-quote-item',
    label: '報價單項目',
    description: '管理報價單項目資料',
    module: 'crm',
    category: 'quote-item',
  },
  {
    name: 'crm-work-order',
    label: '工單管理',
    description: '管理工單資料',
    module: 'crm',
    category: 'work-order',
  },
  {
    name: 'crm-work-order-item',
    label: '工單項目',
    description: '管理工單項目資料',
    module: 'crm',
    category: 'work-order-item',
  },
  {
    name: 'crm-cutting',
    label: '切割管理',
    description: '管理切割資料',
    module: 'crm',
    category: 'cutting',
  },
  // HR 模組
  {
    name: 'hr-staff',
    label: '員工管理',
    description: '管理員工資料',
    module: 'hr',
    category: 'staff',
  },
  {
    name: 'hr-staff-leave',
    label: '員工請假',
    description: '管理員工請假記錄',
    module: 'hr',
    category: 'staff-leave',
  },
  {
    name: 'hr-staff-vacation',
    label: '員工休假',
    description: '管理員工休假記錄',
    module: 'hr',
    category: 'staff-vacation',
  },
  {
    name: 'hr-staff-manhour',
    label: '員工工時',
    description: '管理員工工時記錄',
    module: 'hr',
    category: 'staff-manhour',
  },
  {
    name: 'hr-staff-segment',
    label: '員工分段',
    description: '管理員工分段資料',
    module: 'hr',
    category: 'staff-segment',
  },
  {
    name: 'hr-attend-record',
    label: '出勤記錄',
    description: '管理員工出勤記錄',
    module: 'hr',
    category: 'attend-record',
  },
  {
    name: 'hr-working-hours',
    label: '工作時數',
    description: '管理工作時數設定',
    module: 'hr',
    category: 'working-hours',
  },
] as const;

/**
 * 獲取所有功能列表
 */
export function getAllFeatures(): FeatureConfig[] {
  return FEATURES.map((f) => ({ ...f }));
}

/**
 * 根據模組獲取功能列表
 */
export function getFeaturesByModule(module: string): FeatureConfig[] {
  return FEATURES.filter((f) => f.module === module).map((f) => ({ ...f }));
}

/**
 * 根據功能名稱獲取功能配置
 */
export function getFeatureByName(name: string): FeatureConfig | undefined {
  return FEATURES.find((f) => f.name === name);
}

/**
 * 獲取所有模組列表
 */
export function getAllModules(): string[] {
  return Array.from(new Set(FEATURES.map((f) => f.module)));
}

