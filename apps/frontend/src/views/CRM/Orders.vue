<template>
  <div class="orders-page">
    <PageHeader 
      title="訂單管理" 
      description="管理客戶訂單、追蹤訂單狀態和處理訂單流程"
    >
      <template #actions>
        <button class="btn btn-primary">
          <span class="btn-icon">📋</span>
          新增訂單
        </button>
        <button class="btn btn-outline">
          <span class="btn-icon">📊</span>
          訂單報表
        </button>
      </template>
    </PageHeader>

    <!-- 訂單統計 -->
    <div class="orders-overview">
      <OverviewCard 
        icon="📋"
        :value="ordersStats.totalOrders"
        label="總訂單數"
        variant="primary"
      />
      
      <OverviewCard 
        icon="💰"
        :value="`NT$ ${ordersStats.totalAmount}`"
        label="總訂單金額"
        variant="success"
      />
      
      <OverviewCard 
        icon="⏳"
        :value="ordersStats.pendingOrders"
        label="待處理"
        variant="warning"
      />
      
      <OverviewCard 
        icon="✅"
        :value="ordersStats.completedOrders"
        label="已完成"
        variant="success"
      />
    </div>

    <!-- 訂單列表 -->
    <div class="orders-content">
      <SearchFilters
        title="訂單列表"
        :show-search="true"
        search-placeholder="搜尋訂單編號或客戶..."
        :filters="[
          {
            key: 'status',
            placeholder: '全部狀態',
            options: [
              { value: 'pending', label: '待處理' },
              { value: 'processing', label: '處理中' },
              { value: 'shipped', label: '已出貨' },
              { value: 'completed', label: '已完成' },
              { value: 'cancelled', label: '已取消' }
            ]
          }
        ]"
        :show-date-filter="true"
        v-model:search="orderSearch"
        v-model:filter="orderStatus"
        v-model:date="orderDate"
      />

      <DataTable
        :columns="tableColumns"
        :data="filteredOrders"
        :show-actions="true"
      >
        <template #cell-status="{ row }">
          <StatusBadge 
            :text="row.statusText" 
            :variant="getStatusVariant(row.status)"
          />
        </template>
        
        <template #cell-amount="{ value }">
          NT$ {{ value }}
        </template>
        
        <template #actions>
          <button class="btn btn-sm btn-outline">查看詳情</button>
          <button class="btn btn-sm btn-primary">編輯</button>
        </template>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { PageHeader, OverviewCard, DataTable, SearchFilters, StatusBadge } from '@/components';

// 訂單統計
const ordersStats = ref({
  totalOrders: 89,
  totalAmount: '12,450,000',
  pendingOrders: 15,
  completedOrders: 67,
});

// 搜尋和篩選
const orderSearch = ref('');
const orderStatus = ref('');
const orderDate = ref('');

// 訂單資料
const orders = ref([
  {
    id: 1,
    orderNumber: 'ORD-2024-001',
    customerName: '台灣精密工業',
    orderDate: '2024-01-15',
    amount: '2,500,000',
    status: 'processing',
    statusText: '處理中',
    expectedDelivery: '2024-02-15',
    owner: '張小明',
  },
  {
    id: 2,
    orderNumber: 'ORD-2024-002',
    customerName: '華碩汽車零件',
    orderDate: '2024-01-14',
    amount: '1,800,000',
    status: 'pending',
    statusText: '待處理',
    expectedDelivery: '2024-02-10',
    owner: '李小華',
  },
  {
    id: 3,
    orderNumber: 'ORD-2024-003',
    customerName: '電子科技企業',
    orderDate: '2024-01-13',
    amount: '3,200,000',
    status: 'shipped',
    statusText: '已出貨',
    expectedDelivery: '2024-01-25',
    owner: '王美玲',
  },
]);

// 表格列定義
const tableColumns = [
  { key: 'orderNumber', label: '訂單編號' },
  { key: 'customerName', label: '客戶名稱' },
  { key: 'orderDate', label: '訂單日期' },
  { key: 'amount', label: '訂單金額' },
  { key: 'status', label: '訂單狀態' },
  { key: 'expectedDelivery', label: '預計交期' },
  { key: 'owner', label: '負責人' }
];

// 篩選後的訂單
const filteredOrders = computed(() => {
  let filtered = orders.value;

  if (orderSearch.value) {
    filtered = filtered.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(orderSearch.value.toLowerCase()) ||
        order.customerName.toLowerCase().includes(orderSearch.value.toLowerCase()),
    );
  }

  if (orderStatus.value) {
    filtered = filtered.filter((order) => order.status === orderStatus.value);
  }

  if (orderDate.value) {
    filtered = filtered.filter((order) => order.orderDate === orderDate.value);
  }

  return filtered;
});

// 取得狀態徽章變體
const getStatusVariant = (status: string) => {
  const variants: Record<string, string> = {
    pending: 'warning',
    processing: 'info',
    shipped: 'primary',
    completed: 'success',
    cancelled: 'danger'
  };
  return variants[status] || 'default';
};
</script>

<style scoped>
.orders-page {
  max-width: 1400px;
  margin: 0 auto;
}

/* 訂單統計 */
.orders-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* 訂單內容 */
.orders-content {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .orders-overview {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .orders-overview {
    grid-template-columns: 1fr;
  }
}
</style>
