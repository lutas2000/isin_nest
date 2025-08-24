<template>
  <div class="orders-page">
    <div class="page-header">
      <div class="header-content">
        <h1>訂單管理</h1>
        <p>管理客戶訂單、追蹤訂單狀態和處理訂單流程</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary">
          <span class="btn-icon">📋</span>
          新增訂單
        </button>
        <button class="btn btn-outline">
          <span class="btn-icon">📊</span>
          訂單報表
        </button>
      </div>
    </div>

    <!-- 訂單統計 -->
    <div class="orders-overview">
      <div class="overview-card">
        <div class="overview-icon">📋</div>
        <div class="overview-content">
          <div class="overview-value">{{ ordersStats.totalOrders }}</div>
          <div class="overview-label">總訂單數</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">💰</div>
        <div class="overview-content">
          <div class="overview-value">NT$ {{ ordersStats.totalAmount }}</div>
          <div class="overview-label">總訂單金額</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">⏳</div>
        <div class="overview-content">
          <div class="overview-value">{{ ordersStats.pendingOrders }}</div>
          <div class="overview-label">待處理</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">✅</div>
        <div class="overview-content">
          <div class="overview-value">{{ ordersStats.completedOrders }}</div>
          <div class="overview-label">已完成</div>
        </div>
      </div>
    </div>

    <!-- 訂單列表 -->
    <div class="orders-content">
      <div class="content-header">
        <h3>訂單列表</h3>
        <div class="header-controls">
          <div class="search-box">
            <input 
              type="text" 
              class="form-control" 
              placeholder="搜尋訂單編號或客戶..."
              v-model="orderSearch"
            />
          </div>
          <select class="form-control" v-model="orderStatus">
            <option value="">全部狀態</option>
            <option value="pending">待處理</option>
            <option value="processing">處理中</option>
            <option value="shipped">已出貨</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
          <input 
            type="date" 
            class="form-control" 
            v-model="orderDate"
          />
        </div>
      </div>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>訂單編號</th>
              <th>客戶名稱</th>
              <th>訂單日期</th>
              <th>訂單金額</th>
              <th>訂單狀態</th>
              <th>預計交期</th>
              <th>負責人</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in filteredOrders" :key="order.id">
              <td>{{ order.orderNumber }}</td>
              <td>{{ order.customerName }}</td>
              <td>{{ order.orderDate }}</td>
              <td>NT$ {{ order.amount }}</td>
              <td>
                <span class="badge" :class="`badge-${order.status}`">
                  {{ order.statusText }}
                </span>
              </td>
              <td>{{ order.expectedDelivery }}</td>
              <td>{{ order.owner }}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn btn-sm btn-outline">查看詳情</button>
                  <button class="btn btn-sm btn-primary">編輯</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

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
</script>

<style scoped>
.orders-page {
  max-width: 1400px;
  margin: 0 auto;
}

/* 頁面標題 */
.page-header {
  background: white;
  padding: 2rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content h1 {
  margin-bottom: 0.5rem;
  color: var(--secondary-900);
}

.header-content p {
  color: var(--secondary-600);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 1rem;
}

.btn-icon {
  margin-right: 0.5rem;
}

/* 訂單統計 */
.orders-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.overview-card {
  background: white;
  padding: 1.5rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.overview-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.overview-content {
  flex: 1;
}

.overview-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.overview-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

/* 訂單內容 */
.orders-content {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.content-header {
  padding: 2rem 2rem 1rem 2rem;
  border-bottom: 1px solid var(--secondary-200);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.content-header h3 {
  margin: 0;
  color: var(--secondary-900);
}

.header-controls {
  display: flex;
  gap: 1rem;
}

.search-box {
  min-width: 300px;
}

/* 表格容器 */
.table-container {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid var(--secondary-200);
}

.table th {
  background-color: var(--secondary-50);
  font-weight: 600;
  color: var(--secondary-700);
  font-size: var(--font-size-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table tbody tr:hover {
  background-color: var(--secondary-50);
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .header-actions {
    width: 100%;
    justify-content: center;
  }
  
  .orders-overview {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .content-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .header-controls {
    width: 100%;
    flex-direction: column;
  }
  
  .search-box {
    min-width: auto;
  }
}

@media (max-width: 480px) {
  .orders-overview {
    grid-template-columns: 1fr;
  }
  
  .content-header {
    padding: 1rem;
  }
  
  .table-container {
    font-size: var(--font-size-sm);
  }
  
  .table th,
  .table td {
    padding: 0.5rem;
  }
}
</style>
