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
              { value: 'processing', label: '處理中' },
              { value: 'completed', label: '已完成' }
            ]
          }
        ]"
        :show-date-filter="true"
        v-model:search="orderSearch"
        v-model:filter="orderStatus"
        v-model:date="orderDate"
      />

      <div v-if="loading" class="loading-message">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <DataTable
        v-else
        :columns="tableColumns"
        :data="filteredOrders"
        :show-actions="true"
      >
        <template #cell-status="{ row }">
          <StatusBadge 
            :text="getStatusText(row.isCompleted)" 
            :variant="getStatusVariant(row.isCompleted)"
          />
        </template>
        
        <template #cell-amount="{ value }">
          NT$ {{ Number(value).toLocaleString('zh-TW') }}
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
import { ref, computed, onMounted } from 'vue';
import { PageHeader, OverviewCard, DataTable, SearchFilters, StatusBadge } from '@/components';
import { workOrderService, type WorkOrder } from '@/services/crm/work-order.service';

// 工單資料
const orders = ref<WorkOrder[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// 工單統計
const ordersStats = computed(() => {
  const total = orders.value.length;
  const totalAmount = orders.value.reduce((sum, o) => sum + Number(o.amount), 0);
  const pendingOrders = orders.value.filter(o => !o.isCompleted).length;
  const completedOrders = orders.value.filter(o => o.isCompleted).length;
  
  return {
    totalOrders: total,
    totalAmount: totalAmount.toLocaleString('zh-TW'),
    pendingOrders,
    completedOrders,
  };
});

// 搜尋和篩選
const orderSearch = ref('');
const orderStatus = ref('');
const orderDate = ref('');

// 表格列定義
const tableColumns = [
  { key: 'id', label: '工單編號' },
  { key: 'customerName', label: '客戶名稱' },
  { key: 'orderDate', label: '建立日期' },
  { key: 'amount', label: '工單金額' },
  { key: 'status', label: '工單狀態' },
  { key: 'staffName', label: '業務員' }
];

// 載入工單資料
const loadOrders = async () => {
  loading.value = true;
  error.value = null;
  try {
    const data = await workOrderService.getAll();
    orders.value = data.map(order => ({
      ...order,
      orderNumber: order.id,
      customerName: order.customer?.companyName || order.customer?.companyShortName || '未知客戶',
      orderDate: order.createdAt ? new Date(order.createdAt).toLocaleDateString('zh-TW') : '',
      amount: order.amount,
      status: order.isCompleted ? 'completed' : 'processing',
      statusText: order.isCompleted ? '已完成' : '處理中',
      staffName: order.staff?.name || '未知',
    }));
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入工單失敗';
    console.error('Failed to load work orders:', err);
  } finally {
    loading.value = false;
  }
};

// 篩選後的工單
const filteredOrders = computed(() => {
  let filtered = orders.value;

  if (orderSearch.value) {
    const search = orderSearch.value.toLowerCase();
    filtered = filtered.filter(
      (order) =>
        order.id.toLowerCase().includes(search) ||
        order.customerName?.toLowerCase().includes(search),
    );
  }

  if (orderStatus.value) {
    if (orderStatus.value === 'completed') {
      filtered = filtered.filter((order) => order.isCompleted);
    } else if (orderStatus.value === 'processing') {
      filtered = filtered.filter((order) => !order.isCompleted);
    }
  }

  if (orderDate.value) {
    filtered = filtered.filter((order) => order.orderDate === orderDate.value);
  }

  return filtered;
});

// 取得狀態徽章變體
const getStatusVariant = (isCompleted: boolean) => {
  return isCompleted ? 'success' : 'info';
};

const getStatusText = (isCompleted: boolean) => {
  return isCompleted ? '已完成' : '處理中';
};

// 初始化
onMounted(() => {
  loadOrders();
});
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

.loading-message,
.error-message {
  padding: 2rem;
  text-align: center;
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  margin-bottom: 2rem;
}

.error-message {
  color: var(--danger-600);
  background: var(--danger-50);
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
