<template>
  <div class="quotes-page">
    <PageHeader 
      title="報價管理" 
      description="管理客戶報價、追蹤報價狀態和處理報價流程"
    >
      <template #actions>
        <button class="btn btn-primary">
          <span class="btn-icon">💰</span>
          新增報價
        </button>
        <button class="btn btn-outline">
          <span class="btn-icon">📊</span>
          報價報表
        </button>
      </template>
    </PageHeader>

    <!-- 報價統計 -->
    <div class="quotes-overview">
      <OverviewCard
        icon="📋"
        :value="quotesStats.totalQuotes"
        label="總報價數"
        variant="primary"
      />
      <OverviewCard
        icon="💰"
        :value="`NT$ ${quotesStats.totalValue}`"
        label="總報價金額"
        variant="success"
      />
      <OverviewCard
        icon="⏳"
        :value="quotesStats.pendingQuotes"
        label="待回覆"
        variant="warning"
      />
      <OverviewCard
        icon="✅"
        :value="quotesStats.acceptedQuotes"
        label="已接受"
        variant="info"
      />
    </div>

    <!-- 報價列表 -->
    <div class="quotes-content">
      <SearchFilters
        title="報價列表"
        :show-search="true"
        search-placeholder="搜尋報價編號或客戶..."
        :filters="[
          {
            key: 'status',
            placeholder: '全部狀態',
            options: [
              { value: 'draft', label: '草稿' },
              { value: 'sent', label: '已發送' },
              { value: 'pending', label: '待回覆' },
              { value: 'accepted', label: '已接受' },
              { value: 'rejected', label: '已拒絕' },
              { value: 'expired', label: '已過期' }
            ]
          }
        ]"
        :show-date-filter="true"
        @update:search="quoteSearch = $event"
        @update:filter="handleFilterUpdate"
        @update:date="quoteDate = $event"
      />

      <DataTable
        :columns="tableColumns"
        :data="filteredQuotes"
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

// 表格列定義
const tableColumns = [
  { key: 'quoteNumber', label: '報價編號' },
  { key: 'customerName', label: '客戶名稱' },
  { key: 'quoteDate', label: '報價日期' },
  { key: 'amount', label: '報價金額' },
  { key: 'status', label: '報價狀態' },
  { key: 'validUntil', label: '有效期限' },
  { key: 'owner', label: '負責人' }
];

// 狀態變體函數
const getStatusVariant = (status: string) => {
  const variants: Record<string, string> = {
    draft: 'secondary',
    sent: 'info',
    pending: 'warning',
    accepted: 'success',
    rejected: 'danger',
    expired: 'secondary'
  };
  return variants[status] || 'default';
};

// 篩選更新處理
const handleFilterUpdate = (key: string, value: string) => {
  if (key === 'status') {
    quoteStatus.value = value;
  }
};

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

/* 移除頁面標題樣式，由 PageHeader 組件處理 */
/* 移除概覽卡片樣式，由 OverviewCard 組件處理 */
/* 移除搜尋和表格樣式，由 SearchFilters 和 DataTable 組件處理 */

/* 響應式設計 */
@media (max-width: 768px) {
  .quotes-overview {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .quotes-overview {
    grid-template-columns: 1fr;
  }
}
</style>
