// API 配置文件
export const API_CONFIG = {
  // 後端 API 基礎 URL
  // Docker/反向代理情境建議用 `/api`（同網域轉發到後端），避免跨網域與主機名稱問題
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',
  
  // 認證相關端點
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    RESET_PASSWORD: '/auth/reset-password',
    UPDATE_USER: '/auth/update-user',
    CREATE_USER_WITH_STAFF: '/auth/create-user-with-staff',
  },
  
  // HR 相關端點
  HR: {
    STAFF: '/staffs',
    STAFF_MANHOUR: '/staff-manhours',
  },
  
  // CRM 相關端點
  CRM: {
    CUSTOMERS: '/crm/customers',
    CONTACTS: '/crm/contacts',
    QUOTES: '/crm/quotes',
    QUOTE_ITEMS: '/crm/quote-items',
    ORDERS: '/crm/orders',
    ORDER_ITEMS: '/crm/order-items',
    // 舊端點（保持向後兼容）
    WORK_ORDERS: '/crm/orders',
    WORK_ORDER_ITEMS: '/crm/order-items',
    // 各類工作單
    DESIGN_WORK_ORDERS: '/crm/design-work-orders',
    CUTTING_WORK_ORDERS: '/crm/cutting-work-orders',
    PROCESSING_WORK_ORDERS: '/crm/processing-work-orders',
    OUTSOURCING_WORK_ORDERS: '/crm/outsourcing-work-orders',
    DELIVERY_WORK_ORDERS: '/crm/delivery-work-orders',
    // 排版
    NESTINGS: '/crm/nestings',
    // 委外成本
    OUTSOURCING_COSTS: '/crm/outsourcing-costs',
    // 配置
    CONFIGS: '/crm/configs', // 分頁端點
    CONFIGS_ALL: '/crm/configs/all', // 無分頁端點
    VENDORS: '/crm/vendors',
    VENDORS_ALL: '/crm/vendors/all',
    PROCESSINGS: '/crm/processings',
  },
}

// 構建完整的 API URL
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`
}
