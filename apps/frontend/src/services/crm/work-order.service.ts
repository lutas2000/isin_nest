// 向後兼容：重新導出 order.service.ts 的所有內容
// 新代碼請使用 order.service.ts
export {
  orderService as workOrderService,
  orderItemService as workOrderItemService,
  type Order as WorkOrder,
  type OrderItem as WorkOrderItem,
  OrderStatus,
} from './order.service'

