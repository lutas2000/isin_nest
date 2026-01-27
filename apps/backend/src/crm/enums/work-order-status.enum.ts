// 設計工作單狀態
export enum DesignWorkOrderStatus {
  PENDING = 'pending',           // 待處理
  IN_PROGRESS = 'in_progress',   // 進行中
  COMPLETED = 'completed',       // 已完成
}

// 切割工作單狀態
export enum CuttingWorkOrderStatus {
  PENDING = 'pending',           // 待處理
  ASSIGNED = 'assigned',         // 已分派
  IN_PROGRESS = 'in_progress',   // 進行中
  COMPLETED = 'completed',       // 已完成
}

// 加工工作單狀態
export enum ProcessingWorkOrderStatus {
  PENDING = 'pending',           // 待處理
  IN_PROGRESS = 'in_progress',   // 進行中
  COMPLETED = 'completed',       // 已完成
}

// 委外加工工作單狀態
export enum OutsourcingWorkOrderStatus {
  PENDING = 'pending',           // 待處理
  SHIPPED = 'shipped',           // 運送中
  PROCESSING = 'processing',     // 加工中
  COMPLETED = 'completed',       // 已完成
  RETURNED = 'returned',         // 已取回
}

// 送貨工作單狀態
export enum DeliveryWorkOrderStatus {
  PENDING = 'pending',           // 待處理
  READY = 'ready',               // 準備送貨
  IN_TRANSIT = 'in_transit',     // 運送中
  DELIVERED = 'delivered',       // 已送達
}
