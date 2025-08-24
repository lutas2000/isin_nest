<template>
  <div class="quotes-page">
    <div class="page-header">
      <div class="header-content">
        <h1>報價管理</h1>
        <p>管理客戶報價、追蹤報價狀態和處理報價流程</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-primary">
          <span class="btn-icon">💰</span>
          新增報價
        </button>
        <button class="btn btn-outline">
          <span class="btn-icon">📊</span>
          報價報表
        </button>
      </div>
    </div>

    <!-- 報價統計 -->
    <div class="quotes-overview">
      <div class="overview-card">
        <div class="overview-icon">📋</div>
        <div class="overview-content">
          <div class="overview-value">{{ quotesStats.totalQuotes }}</div>
          <div class="overview-label">總報價數</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">💰</div>
        <div class="overview-content">
          <div class="overview-value">NT$ {{ quotesStats.totalValue }}</div>
          <div class="overview-label">總報價金額</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">⏳</div>
        <div class="overview-content">
          <div class="overview-value">{{ quotesStats.pendingQuotes }}</div>
          <div class="overview-label">待回覆</div>
        </div>
      </div>
      
      <div class="overview-card">
        <div class="overview-icon">✅</div>
        <div class="overview-content">
          <div class="overview-value">{{ quotesStats.acceptedQuotes }}</div>
          <div class="overview-label">已接受</div>
        </div>
      </div>
    </div>

    <!-- 報價列表 -->
    <div class="quotes-content">
      <div class="content-header">
        <h3>報價列表</h3>
        <div class="header-controls">
          <div class="search-box">
            <input 
              type="text" 
              class="form-control" 
              placeholder="搜尋報價編號或客戶..."
              v-model="quoteSearch"
            />
          </div>
          <select class="form-control" v-model="quoteStatus">
            <option value="">全部狀態</option>
            <option value="draft">草稿</option>
            <option value="sent">已發送</option>
            <option value="pending">待回覆</option>
            <option value="accepted">已接受</option>
            <option value="rejected">已拒絕</option>
            <option value="expired">已過期</option>
          </select>
          <input 
            type="date" 
            class="form-control" 
            v-model="quoteDate"
          />
        </div>
      </div>

      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th>報價編號</th>
              <th>客戶名稱</th>
              <th>報價日期</th>
              <th>報價金額</th>
              <th>報價狀態</th>
              <th>有效期限</th>
              <th>負責人</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="quote in filteredQuotes" :key="quote.id">
              <td>{{ quote.quoteNumber }}</td>
              <td>{{ quote.customerName }}</td>
              <td>{{ quote.quoteDate }}</td>
              <td>NT$ {{ quote.amount }}</td>
              <td>
                <span class="badge" :class="`badge-${quote.status}`">
                  {{ quote.statusText }}
                </span>
              </td>
              <td>{{ quote.validUntil }}</td>
              <td>{{ quote.owner }}</td>
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

// 報價統計
const quotesStats = ref({
  totalQuotes: 45,
  totalValue: '28,750,000',
  pendingQuotes: 12,
  acceptedQuotes: 18,
});

// 搜尋和篩選
const quoteSearch = ref('');
const quoteStatus = ref('');
const quoteDate = ref('');

// 報價資料
const quotes = ref([
  {
    id: 1,
    quoteNumber: 'QT-2024-001',
    customerName: '台灣精密工業',
    quoteDate: '2024-01-15',
    amount: '2,500,000',
    status: 'pending',
    statusText: '待回覆',
    validUntil: '2024-02-15',
    owner: '張小明',
  },
  {
    id: 2,
    quoteNumber: 'QT-2024-002',
    customerName: '華碩汽車零件',
    quoteDate: '2024-01-14',
    amount: '1,800,000',
    status: 'sent',
    statusText: '已發送',
    validUntil: '2024-02-10',
    owner: '李小華',
  },
  {
    id: 3,
    quoteNumber: 'QT-2024-003',
    customerName: '電子科技企業',
    quoteDate: '2024-01-13',
    amount: '3,200,000',
    status: 'accepted',
    statusText: '已接受',
    validUntil: '2024-01-25',
    owner: '王美玲',
  },
]);

// 篩選後的報價
const filteredQuotes = computed(() => {
  let filtered = quotes.value;

  if (quoteSearch.value) {
    filtered = filtered.filter(
      (quote) =>
        quote.quoteNumber.toLowerCase().includes(quoteSearch.value.toLowerCase()) ||
        quote.customerName.toLowerCase().includes(quoteSearch.value.toLowerCase()),
    );
  }

  if (quoteStatus.value) {
    filtered = filtered.filter((quote) => quote.status === quoteStatus.value);
  }

  if (quoteDate.value) {
    filtered = filtered.filter((quote) => quote.quoteDate === quoteDate.value);
  }

  return filtered;
});
</script>

<style scoped>
.quotes-page {
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

/* 報價統計 */
.quotes-overview {
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

/* 報價內容 */
.quotes-content {
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
  
  .quotes-overview {
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
  .quotes-overview {
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
