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
              { value: 'pending', label: '待簽名' },
              { value: 'signed', label: '已簽名' }
            ]
          }
        ]"
        :show-date-filter="true"
        @update:search="quoteSearch = $event"
        @update:filter="handleFilterUpdate"
        @update:date="quoteDate = $event"
      />

      <div v-if="loading" class="loading-message">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <DataTable
        v-else
        :columns="tableColumns"
        :data="filteredQuotes"
        :show-actions="true"
      >
        <template #cell-status="{ row }">
          <StatusBadge 
            :text="getStatusText(row.isSigned)" 
            :variant="getStatusVariant(row.isSigned)"
          />
        </template>
        
        <template #cell-totalAmount="{ value }">
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
import { quoteService, type Quote } from '@/services/crm/quote.service';

// 報價資料
const quotes = ref<Quote[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// 報價統計
const quotesStats = computed(() => {
  const total = quotes.value.length;
  const totalValue = quotes.value.reduce((sum, q) => sum + Number(q.totalAmount), 0);
  const pendingQuotes = quotes.value.filter(q => !q.isSigned).length;
  const acceptedQuotes = quotes.value.filter(q => q.isSigned).length;
  
  return {
    totalQuotes: total,
    totalValue: totalValue.toLocaleString('zh-TW'),
    pendingQuotes,
    acceptedQuotes,
  };
});

// 搜尋和篩選
const quoteSearch = ref('');
const quoteStatus = ref('');
const quoteDate = ref('');

// 表格列定義
const tableColumns = [
  { key: 'id', label: '報價編號' },
  { key: 'customerName', label: '客戶名稱' },
  { key: 'quoteDate', label: '報價日期' },
  { key: 'totalAmount', label: '報價金額' },
  { key: 'status', label: '報價狀態' },
  { key: 'staffName', label: '負責人' }
];

// 狀態變體函數
const getStatusVariant = (isSigned: boolean) => {
  return isSigned ? 'success' : 'warning';
};

const getStatusText = (isSigned: boolean) => {
  return isSigned ? '已簽名' : '待簽名';
};

// 篩選更新處理
const handleFilterUpdate = (key: string, value: string) => {
  if (key === 'status') {
    quoteStatus.value = value;
  }
};

// 載入報價資料
const loadQuotes = async () => {
  loading.value = true;
  error.value = null;
  try {
    const data = await quoteService.getAll();
    quotes.value = data.map(quote => ({
      ...quote,
      quoteNumber: `QT-${quote.id}`,
      customerName: quote.customer?.companyName || quote.customer?.companyShortName || '未知客戶',
      quoteDate: quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('zh-TW') : '',
      amount: quote.totalAmount.toLocaleString('zh-TW'),
      status: quote.isSigned ? 'signed' : 'pending',
      statusText: getStatusText(quote.isSigned),
      staffName: quote.staff?.name || '未知',
    }));
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入報價單失敗';
    console.error('Failed to load quotes:', err);
  } finally {
    loading.value = false;
  }
};

// 篩選後的報價
const filteredQuotes = computed(() => {
  let filtered = quotes.value;

  if (quoteSearch.value) {
    const search = quoteSearch.value.toLowerCase();
    filtered = filtered.filter(
      (quote) =>
        quote.quoteNumber?.toLowerCase().includes(search) ||
        quote.customerName?.toLowerCase().includes(search),
    );
  }

  if (quoteStatus.value) {
    if (quoteStatus.value === 'signed') {
      filtered = filtered.filter((quote) => quote.isSigned);
    } else if (quoteStatus.value === 'pending') {
      filtered = filtered.filter((quote) => !quote.isSigned);
    }
  }

  if (quoteDate.value) {
    filtered = filtered.filter((quote) => quote.quoteDate === quoteDate.value);
  }

  return filtered;
});

// 初始化
onMounted(() => {
  loadQuotes();
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
