<template>
  <div class="sales-page">
    <div class="page-header">
      <div class="header-content">
        <h1>銷售管理</h1>
        <p>管理客戶訂單、報價和銷售活動</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary">
          <span class="btn-icon">📋</span>
          新增訂單
        </button>
        <button class="btn btn-outline">
          <span class="btn-icon">💰</span>
          建立報價
        </button>
      </div>
    </div>

    <!-- 銷售概覽 -->
    <div class="sales-overview">
      <div class="overview-card">
        <div class="overview-icon">💰</div>
        <div class="overview-content">
          <div class="overview-value">NT$ 3,250,000</div>
          <div class="overview-label">本月銷售額</div>
          <div class="overview-change positive">+15.3%</div>
        </div>
      </div>

      <div class="overview-card">
        <div class="overview-icon">📦</div>
        <div class="overview-content">
          <div class="overview-value">156</div>
          <div class="overview-label">本月訂單數</div>
          <div class="overview-change positive">+8.7%</div>
        </div>
      </div>

      <div class="overview-card">
        <div class="overview-icon">👥</div>
        <div class="overview-content">
          <div class="overview-value">89</div>
          <div class="overview-label">活躍客戶</div>
          <div class="overview-change positive">+3.2%</div>
        </div>
      </div>

      <div class="overview-card">
        <div class="overview-icon">📊</div>
        <div class="overview-content">
          <div class="overview-value">87.5%</div>
          <div class="overview-label">訂單完成率</div>
          <div class="overview-change positive">+2.1%</div>
        </div>
      </div>
    </div>

    <!-- 主要內容區域 -->
    <div class="sales-content">
      <div class="content-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 訂單管理 -->
      <div v-if="activeTab === 'orders'" class="tab-content">
        <div class="content-header">
          <h3>訂單管理</h3>
          <div class="header-controls">
            <div class="search-box">
              <input
                type="text"
                class="form-control"
                placeholder="搜尋訂單..."
                v-model="orderSearch"
              />
            </div>
            <select class="form-control" v-model="orderFilter">
              <option value="">全部狀態</option>
              <option value="pending">待處理</option>
              <option value="processing">製作中</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>
        </div>

        <div class="table-container">
          <table class="table">
            <thead>
              <tr>
                <th>訂單編號</th>
                <th>客戶名稱</th>
                <th>產品</th>
                <th>數量</th>
                <th>金額</th>
                <th>狀態</th>
                <th>建立日期</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in filteredOrders" :key="order.id">
                <td>{{ order.id }}</td>
                <td>{{ order.customer }}</td>
                <td>{{ order.product }}</td>
                <td>{{ order.quantity }}</td>
                <td>{{ order.amount }}</td>
                <td>
                  <span class="badge" :class="`badge-${order.status}`">
                    {{ order.statusText }}
                  </span>
                </td>
                <td>{{ order.createdAt }}</td>
                <td>
                  <div class="action-buttons">
                    <button class="btn btn-sm btn-outline">查看</button>
                    <button class="btn btn-sm btn-primary">編輯</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 客戶管理 -->
      <div v-if="activeTab === 'customers'" class="tab-content">
        <div class="content-header">
          <h3>客戶管理</h3>
          <button class="btn btn-primary">新增客戶</button>
        </div>

        <div class="customers-grid">
          <div
            class="customer-card"
            v-for="customer in customers"
            :key="customer.id"
          >
            <div class="customer-header">
              <div class="customer-avatar">{{ customer.avatar }}</div>
              <div class="customer-info">
                <h4>{{ customer.name }}</h4>
                <p>{{ customer.industry }}</p>
              </div>
              <div class="customer-status">
                <span class="badge" :class="`badge-${customer.status}`">
                  {{ customer.statusText }}
                </span>
              </div>
            </div>

            <div class="customer-details">
              <div class="detail-item">
                <span class="detail-label">聯絡人：</span>
                <span>{{ customer.contact }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">電話：</span>
                <span>{{ customer.phone }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">電子郵件：</span>
                <span>{{ customer.email }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">累計訂單：</span>
                <span>{{ customer.totalOrders }}</span>
              </div>
            </div>

            <div class="customer-actions">
              <button class="btn btn-sm btn-outline">查看詳情</button>
              <button class="btn btn-sm btn-primary">編輯</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 銷售報表 -->
      <div v-if="activeTab === 'reports'" class="tab-content">
        <div class="content-header">
          <h3>銷售報表</h3>
          <div class="report-controls">
            <select class="form-control" v-model="reportPeriod">
              <option value="week">本週</option>
              <option value="month">本月</option>
              <option value="quarter">本季</option>
              <option value="year">本年</option>
            </select>
            <button class="btn btn-primary">匯出報表</button>
          </div>
        </div>

        <div class="reports-grid">
          <div class="report-card">
            <h4>銷售趨勢</h4>
            <div class="chart-placeholder">
              <div class="chart-text">📈 銷售趨勢圖表</div>
              <p>顯示選定期間的銷售額變化趨勢</p>
            </div>
          </div>

          <div class="report-card">
            <h4>產品銷售排行</h4>
            <div class="ranking-list">
              <div
                class="ranking-item"
                v-for="(product, index) in topProducts"
                :key="product.id"
              >
                <div class="ranking-number">{{ index + 1 }}</div>
                <div class="ranking-info">
                  <div class="product-name">{{ product.name }}</div>
                  <div class="product-sales">{{ product.sales }} 件</div>
                </div>
                <div class="ranking-amount">{{ product.amount }}</div>
              </div>
            </div>
          </div>

          <div class="report-card">
            <h4>客戶分析</h4>
            <div class="customer-stats">
              <div class="stat-item">
                <div class="stat-label">新客戶</div>
                <div class="stat-value">{{ customerStats.new }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">回購客戶</div>
                <div class="stat-value">{{ customerStats.returning }}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">流失客戶</div>
                <div class="stat-value">{{ customerStats.lost }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

// 頁面標籤
const tabs = [
  { id: 'orders', label: '訂單管理' },
  { id: 'customers', label: '客戶管理' },
  { id: 'reports', label: '銷售報表' },
];

const activeTab = ref('orders');

// 訂單搜尋和篩選
const orderSearch = ref('');
const orderFilter = ref('');

// 訂單資料
const orders = ref([
  {
    id: 'ORD-2024-001',
    customer: '台灣精密工業',
    product: '鋁合金零件 A-123',
    quantity: 100,
    amount: 'NT$ 45,000',
    status: 'processing',
    statusText: '製作中',
    createdAt: '2024-01-15',
  },
  {
    id: 'ORD-2024-002',
    customer: '高雄機械廠',
    product: '不鏽鋼軸承 B-456',
    quantity: 50,
    amount: 'NT$ 32,000',
    status: 'pending',
    statusText: '待處理',
    createdAt: '2024-01-16',
  },
  {
    id: 'ORD-2024-003',
    customer: '台中製造商',
    product: '銅合金接頭 C-789',
    quantity: 200,
    amount: 'NT$ 78,000',
    status: 'completed',
    statusText: '已完成',
    createdAt: '2024-01-14',
  },
]);

// 篩選後的訂單
const filteredOrders = computed(() => {
  let filtered = orders.value;

  if (orderSearch.value) {
    filtered = filtered.filter(
      (order) =>
        order.id.toLowerCase().includes(orderSearch.value.toLowerCase()) ||
        order.customer
          .toLowerCase()
          .includes(orderSearch.value.toLowerCase()) ||
        order.product.toLowerCase().includes(orderSearch.value.toLowerCase()),
    );
  }

  if (orderFilter.value) {
    filtered = filtered.filter((order) => order.status === orderFilter.value);
  }

  return filtered;
});

// 客戶資料
const customers = ref([
  {
    id: 1,
    name: '台灣精密工業',
    industry: '精密機械製造',
    avatar: '🏭',
    status: 'active',
    statusText: '活躍',
    contact: '張經理',
    phone: '02-2345-6789',
    email: 'zhang@precision.com.tw',
    totalOrders: 45,
  },
  {
    id: 2,
    name: '高雄機械廠',
    industry: '重工業設備',
    avatar: '⚙️',
    status: 'active',
    statusText: '活躍',
    contact: '李主任',
    phone: '07-3456-7890',
    email: 'li@machinery.com.tw',
    totalOrders: 32,
  },
  {
    id: 3,
    name: '台中製造商',
    industry: '汽車零件',
    avatar: '🚗',
    status: 'inactive',
    statusText: '非活躍',
    contact: '王副總',
    phone: '04-4567-8901',
    email: 'wang@auto.com.tw',
    totalOrders: 28,
  },
]);

// 報表設定
const reportPeriod = ref('month');

// 熱門產品
const topProducts = ref([
  { id: 1, name: '鋁合金零件 A-123', sales: 450, amount: 'NT$ 202,500' },
  { id: 2, name: '不鏽鋼軸承 B-456', sales: 320, amount: 'NT$ 204,800' },
  { id: 3, name: '銅合金接頭 C-789', sales: 280, amount: 'NT$ 109,200' },
  { id: 4, name: '鈦合金螺絲 D-012', sales: 180, amount: 'NT$ 72,000' },
]);

// 客戶統計
const customerStats = ref({
  new: 12,
  returning: 67,
  lost: 3,
});
</script>

<style scoped>
.sales-page {
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

/* 銷售概覽 */
.sales-overview {
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
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
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
  margin-bottom: 0.5rem;
}

.overview-change {
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius);
  display: inline-block;
}

.overview-change.positive {
  background-color: var(--success-100);
  color: var(--success-700);
}

/* 主要內容區域 */
.sales-content {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.content-tabs {
  display: flex;
  border-bottom: 1px solid var(--secondary-200);
  background-color: var(--secondary-50);
}

.tab-btn {
  background: none;
  border: none;
  padding: 1rem 2rem;
  cursor: pointer;
  font-weight: 500;
  color: var(--secondary-600);
  transition: all 0.2s ease;
  border-bottom: 3px solid transparent;
}

.tab-btn:hover {
  color: var(--secondary-800);
  background-color: var(--secondary-100);
}

.tab-btn.active {
  color: var(--primary-600);
  border-bottom-color: var(--primary-600);
  background-color: white;
}

.tab-content {
  padding: 2rem;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
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

/* 客戶網格 */
.customers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.customer-card {
  background: var(--secondary-50);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--secondary-200);
}

.customer-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.customer-avatar {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.customer-info h4 {
  margin: 0 0 0.25rem 0;
  color: var(--secondary-900);
}

.customer-info p {
  margin: 0;
  color: var(--secondary-600);
  font-size: var(--font-size-sm);
}

.customer-details {
  margin-bottom: 1.5rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: var(--font-size-sm);
}

.detail-label {
  color: var(--secondary-600);
  font-weight: 500;
}

.customer-actions {
  display: flex;
  gap: 0.5rem;
}

/* 報表控制 */
.report-controls {
  display: flex;
  gap: 1rem;
}

/* 報表網格 */
.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.report-card {
  background: var(--secondary-50);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--secondary-200);
}

.report-card h4 {
  margin: 0 0 1rem 0;
  color: var(--secondary-900);
}

.chart-placeholder {
  text-align: center;
  padding: 3rem 1rem;
  background: white;
  border-radius: var(--border-radius);
  border: 2px dashed var(--secondary-300);
}

.chart-text {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.chart-placeholder p {
  color: var(--secondary-600);
  margin: 0;
}

/* 排行榜 */
.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: white;
  border-radius: var(--border-radius);
}

.ranking-number {
  width: 2rem;
  height: 2rem;
  background: var(--primary-500);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: var(--font-size-sm);
}

.ranking-info {
  flex: 1;
}

.product-name {
  font-weight: 500;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.product-sales {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

.ranking-amount {
  font-weight: 600;
  color: var(--primary-600);
}

/* 客戶統計 */
.customer-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat-item {
  text-align: center;
  padding: 1rem;
  background: white;
  border-radius: var(--border-radius);
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--primary-600);
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

  .sales-overview {
    grid-template-columns: 1fr;
  }

  .content-tabs {
    flex-wrap: wrap;
  }

  .tab-btn {
    flex: 1;
    min-width: 120px;
    text-align: center;
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

  .customers-grid {
    grid-template-columns: 1fr;
  }

  .reports-grid {
    grid-template-columns: 1fr;
  }

  .customer-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .tab-content {
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
