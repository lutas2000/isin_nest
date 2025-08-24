<template>
  <div class="crm-page">
    <div class="page-header">
      <div class="header-content">
        <h1>客戶關係管理</h1>
        <p>管理客戶資訊、銷售機會和客戶服務</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary">
          <span class="btn-icon">👥</span>
          新增客戶
        </button>
        <button class="btn btn-outline">
          <span class="btn-icon">📊</span>
          CRM 報表
        </button>
      </div>
    </div>

    <!-- CRM 概覽 -->
    <div class="crm-overview">
      <div class="overview-card">
        <div class="overview-icon">👥</div>
        <div class="overview-content">
          <div class="overview-value">{{ crmStats.totalCustomers }}</div>
          <div class="overview-label">總客戶數</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">💰</div>
        <div class="overview-content">
          <div class="overview-value">NT$ {{ crmStats.totalRevenue }}</div>
          <div class="overview-label">總營收</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">🎯</div>
        <div class="overview-content">
          <div class="overview-value">{{ crmStats.activeOpportunities }}</div>
          <div class="overview-label">活躍機會</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">📈</div>
        <div class="overview-content">
          <div class="overview-value">{{ crmStats.conversionRate }}%</div>
          <div class="overview-label">轉換率</div>
        </div>
      </div>
    </div>

    <!-- 主要內容區域 -->
    <div class="crm-content">
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

      <!-- 客戶概覽 -->
      <div v-if="activeTab === 'overview'" class="tab-content">
        <div class="content-header">
          <h3>客戶概覽</h3>
          <div class="header-controls">
            <div class="search-box">
              <input 
                type="text" 
                class="form-control" 
                placeholder="搜尋客戶名稱或公司..."
                v-model="customerSearch"
              />
            </div>
            <select class="form-control" v-model="customerStatus">
              <option value="">全部狀態</option>
              <option value="active">活躍</option>
              <option value="inactive">非活躍</option>
              <option value="prospect">潛在客戶</option>
            </select>
            <select class="form-control" v-model="customerType">
              <option value="">全部類型</option>
              <option value="manufacturing">製造業</option>
              <option value="automotive">汽車業</option>
              <option value="electronics">電子業</option>
              <option value="other">其他</option>
            </select>
          </div>
        </div>

        <div class="customers-grid">
          <div class="customer-card" v-for="customer in filteredCustomers" :key="customer.id">
            <div class="customer-header">
              <div class="customer-avatar">{{ customer.name.charAt(0) }}</div>
              <div class="customer-info">
                <h4>{{ customer.name }}</h4>
                <p>{{ customer.company }}</p>
                <span class="badge" :class="`badge-${customer.status}`">
                  {{ customer.statusText }}
                </span>
              </div>
            </div>
            
            <div class="customer-details">
              <div class="detail-row">
                <span class="detail-label">聯絡人：</span>
                <span class="detail-value">{{ customer.contact }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">電話：</span>
                <span class="detail-value">{{ customer.phone }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">電子郵件：</span>
                <span class="detail-value">{{ customer.email }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">最近訂單：</span>
                <span class="detail-value">{{ customer.lastOrder || '無' }}</span>
              </div>
            </div>
            
            <div class="customer-actions">
              <button class="btn btn-sm btn-outline">查看詳情</button>
              <button class="btn btn-sm btn-primary">編輯</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 銷售機會 -->
      <div v-if="activeTab === 'opportunities'" class="tab-content">
        <div class="content-header">
          <h3>銷售機會</h3>
          <div class="header-controls">
            <button class="btn btn-primary">新增機會</button>
          </div>
        </div>

        <div class="opportunities-grid">
          <div class="opportunity-card" v-for="opportunity in salesOpportunities" :key="opportunity.id">
            <div class="opportunity-header">
              <div class="opportunity-title">{{ opportunity.title }}</div>
              <div class="opportunity-value">NT$ {{ opportunity.value }}</div>
            </div>
            
            <div class="opportunity-details">
              <div class="detail-row">
                <span class="detail-label">客戶：</span>
                <span class="detail-value">{{ opportunity.customer }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">階段：</span>
                <span class="badge" :class="`badge-${opportunity.stage}`">
                  {{ opportunity.stageText }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">預計成交：</span>
                <span class="detail-value">{{ opportunity.expectedClose }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">負責人：</span>
                <span class="detail-value">{{ opportunity.owner }}</span>
              </div>
            </div>
            
            <div class="opportunity-progress">
              <div class="progress-label">進度</div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: opportunity.probability + '%' }"></div>
              </div>
              <div class="progress-text">{{ opportunity.probability }}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 客戶服務 -->
      <div v-if="activeTab === 'service'" class="tab-content">
        <div class="content-header">
          <h3>客戶服務</h3>
          <div class="header-controls">
            <button class="btn btn-primary">新增服務單</button>
          </div>
        </div>

        <div class="service-tickets">
          <div class="ticket-item" v-for="ticket in serviceTickets" :key="ticket.id">
            <div class="ticket-header">
              <div class="ticket-id">#{{ ticket.id }}</div>
              <div class="ticket-priority">
                <span class="badge" :class="`badge-${ticket.priority}`">
                  {{ ticket.priorityText }}
                </span>
              </div>
            </div>
            
            <div class="ticket-content">
              <div class="ticket-title">{{ ticket.title }}</div>
              <div class="ticket-customer">{{ ticket.customer }}</div>
              <div class="ticket-description">{{ ticket.description }}</div>
            </div>
            
            <div class="ticket-footer">
              <div class="ticket-status">
                <span class="badge" :class="`badge-${ticket.status}`">
                  {{ ticket.statusText }}
                </span>
              </div>
              <div class="ticket-date">{{ ticket.createdDate }}</div>
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
  { id: 'overview', label: '客戶概覽' },
  { id: 'opportunities', label: '銷售機會' },
  { id: 'service', label: '客戶服務' },
];

const activeTab = ref('overview');

// CRM 統計
const crmStats = ref({
  totalCustomers: 156,
  totalRevenue: '45,680,000',
  activeOpportunities: 23,
  conversionRate: 68.5,
});

// 搜尋和篩選
const customerSearch = ref('');
const customerStatus = ref('');
const customerType = ref('');

// 客戶資料
const customers = ref([
  {
    id: 1,
    name: '王大明',
    company: '台灣精密工業股份有限公司',
    status: 'active',
    statusText: '活躍',
    contact: '王大明',
    phone: '02-2345-6789',
    email: 'wang@precision.com.tw',
    lastOrder: '2024-01-10',
    type: 'manufacturing',
  },
  {
    id: 2,
    name: '李小華',
    company: '華碩汽車零件有限公司',
    status: 'active',
    statusText: '活躍',
    contact: '李小華',
    phone: '04-5678-9012',
    email: 'li@auto-parts.com.tw',
    lastOrder: '2024-01-08',
    type: 'automotive',
  },
  {
    id: 3,
    name: '張美玲',
    company: '電子科技企業',
    status: 'prospect',
    statusText: '潛在客戶',
    contact: '張美玲',
    phone: '03-3456-7890',
    email: 'zhang@etech.com.tw',
    lastOrder: null,
    type: 'electronics',
  },
]);

// 篩選後的客戶
const filteredCustomers = computed(() => {
  let filtered = customers.value;

  if (customerSearch.value) {
    filtered = filtered.filter(
      (customer) =>
        customer.name.toLowerCase().includes(customerSearch.value.toLowerCase()) ||
        customer.company.toLowerCase().includes(customerSearch.value.toLowerCase()),
    );
  }

  if (customerStatus.value) {
    filtered = filtered.filter((customer) => customer.status === customerStatus.value);
  }

  if (customerType.value) {
    filtered = filtered.filter((customer) => customer.type === customerType.value);
  }

  return filtered;
});

// 銷售機會
const salesOpportunities = ref([
  {
    id: 1,
    title: 'CNC 加工設備採購',
    value: '2,500,000',
    customer: '台灣精密工業',
    stage: 'proposal',
    stageText: '提案階段',
    expectedClose: '2024-02-15',
    owner: '張小明',
    probability: 75,
  },
  {
    id: 2,
    title: '汽車零件模具開發',
    value: '1,800,000',
    customer: '華碩汽車零件',
    stage: 'negotiation',
    stageText: '談判階段',
    expectedClose: '2024-01-30',
    owner: '李小華',
    probability: 60,
  },
  {
    id: 3,
    title: '電子元件生產線',
    value: '3,200,000',
    customer: '電子科技企業',
    stage: 'qualification',
    stageText: '資格確認',
    expectedClose: '2024-03-01',
    owner: '王美玲',
    probability: 40,
  },
]);

// 服務單
const serviceTickets = ref([
  {
    id: 'SRV-001',
    title: '設備維護保養',
    customer: '台灣精密工業',
    description: 'CNC 設備定期保養服務',
    priority: 'medium',
    priorityText: '中',
    status: 'open',
    statusText: '處理中',
    createdDate: '2024-01-15',
  },
  {
    id: 'SRV-002',
    title: '技術支援',
    customer: '華碩汽車零件',
    description: '新設備操作技術指導',
    priority: 'high',
    priorityText: '高',
    status: 'pending',
    statusText: '待處理',
    createdDate: '2024-01-14',
  },
  {
    id: 'SRV-003',
    title: '零件更換',
    customer: '電子科技企業',
    description: '磨損零件更換服務',
    priority: 'low',
    priorityText: '低',
    status: 'closed',
    statusText: '已完成',
    createdDate: '2024-01-10',
  },
]);
</script>

<style scoped>
.crm-page {
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

/* CRM 概覽 */
.crm-overview {
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

/* 主要內容區域 */
.crm-content {
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

/* 客戶網格 */
.customers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
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
  margin-bottom: 1.5rem;
}

.customer-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--primary-500);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: var(--font-size-xl);
}

.customer-info h4 {
  margin: 0 0 0.25rem 0;
  color: var(--secondary-900);
}

.customer-info p {
  margin: 0 0 0.5rem 0;
  color: var(--secondary-600);
  font-size: var(--font-size-sm);
}

.customer-details {
  margin-bottom: 1.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: var(--font-size-sm);
}

.detail-label {
  color: var(--secondary-600);
  font-weight: 500;
}

.detail-value {
  color: var(--secondary-900);
}

.customer-actions {
  display: flex;
  gap: 0.5rem;
}

/* 銷售機會網格 */
.opportunities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
}

.opportunity-card {
  background: var(--secondary-50);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--secondary-200);
}

.opportunity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.opportunity-title {
  font-weight: 600;
  color: var(--secondary-900);
  font-size: var(--font-size-lg);
}

.opportunity-value {
  font-weight: 700;
  color: var(--primary-600);
  font-size: var(--font-size-lg);
}

.opportunity-details {
  margin-bottom: 1.5rem;
}

.opportunity-progress {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.progress-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
  font-weight: 500;
  min-width: 40px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--secondary-200);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-500);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
  font-weight: 500;
  min-width: 40px;
  text-align: right;
}

/* 服務單 */
.service-tickets {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ticket-item {
  background: var(--secondary-50);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--secondary-200);
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.ticket-id {
  font-weight: 600;
  color: var(--secondary-700);
  font-size: var(--font-size-sm);
}

.ticket-content {
  margin-bottom: 1rem;
}

.ticket-title {
  font-weight: 600;
  color: var(--secondary-900);
  margin-bottom: 0.5rem;
}

.ticket-customer {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
  margin-bottom: 0.5rem;
}

.ticket-description {
  color: var(--secondary-700);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.ticket-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ticket-date {
  font-size: var(--font-size-sm);
  color: var(--secondary-500);
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
  
  .crm-overview {
    grid-template-columns: repeat(2, 1fr);
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
  
  .opportunities-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .crm-overview {
    grid-template-columns: 1fr;
  }
  
  .tab-content {
    padding: 1rem;
  }
  
  .customer-card,
  .opportunity-card,
  .ticket-item {
    padding: 1rem;
  }
}
</style>
