<template>
  <div class="quote-items-page">
    <PageHeader 
      title="報價單詳情" 
      :description="quote ? `` : '載入中...'"
    >
      <template #actions>
        <button class="btn btn-outline" @click="goBack">
          <span class="btn-icon">←</span>
          返回
        </button>
      </template>
    </PageHeader>

    <div v-if="loading" class="loading-message">載入中...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>
    
    <div v-else-if="quote" class="quote-items-content">
      <!-- 報價單詳細資訊 -->
      <div class="quote-details-card">
        <TableHeader title="報價單資訊" />
        <div class="details-content">
          <div class="details-section">
            <h4>基本資訊</h4>
            <div class="details-grid">
              <div class="details-item">
                <span class="details-label">報價單編號：</span>
                <span class="details-value">{{ quote.id }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">經手人：</span>
                <span class="details-value">{{ quote.staff?.name || '未知' }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">客戶：</span>
                <span class="details-value">
                  {{ quote.customer?.companyName || quote.customer?.companyShortName || '未指定' }}
                </span>
              </div>
              <div class="details-item">
                <span class="details-label">狀態：</span>
                <span class="details-value">
                  <StatusBadge 
                    :text="quote.isSigned ? '已簽名' : '待簽名'" 
                    :variant="quote.isSigned ? 'success' : 'warning'"
                  />
                </span>
              </div>
            </div>
          </div>

          <div class="details-section">
            <h4>金額資訊</h4>
            <div class="details-grid">
              <div class="details-item">
                <span class="details-label">總計金額：</span>
                <span class="details-value highlight">NT$ {{ Number(quote.totalAmount).toLocaleString('zh-TW') }}</span>
              </div>
            </div>
          </div>

          <div class="details-section" v-if="quote.notes">
            <h4>注意事項</h4>
            <p>{{ quote.notes }}</p>
          </div>

          <div class="details-section">
            <h4>時間資訊</h4>
            <div class="details-grid">
              <div class="details-item">
                <span class="details-label">建立時間：</span>
                <span class="details-value">
                  {{ quote.createdAt ? new Date(quote.createdAt).toLocaleString('zh-TW') : '未知' }}
                </span>
              </div>
              <div class="details-item" v-if="quote.updatedAt">
                <span class="details-label">更新時間：</span>
                <span class="details-value">
                  {{ new Date(quote.updatedAt).toLocaleString('zh-TW') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 報價單工件列表 -->
      <div class="quote-items-card">
        <TableHeader title="報價單工件列表" />
        <div v-if="quoteItems.length === 0" class="empty-message">
          此報價單尚無工件項目
        </div>
        <div v-else class="quote-items-list">
          <div 
            class="quote-item-card" 
            v-for="item in quoteItems" 
            :key="item.id"
          >
            <div class="quote-item-header">
              <span class="quote-item-title">工件 #{{ item.id }}</span>
              <span class="quote-item-amount">
                NT$ {{ Number(item.unitPrice * item.quantity).toLocaleString('zh-TW') }}
              </span>
            </div>
            <div class="quote-item-details">
              <div class="detail-row" v-if="item.customerFile">
                <span class="detail-label">客戶圖檔：</span>
                <span class="detail-value">{{ item.customerFile }}</span>
              </div>
              <div class="detail-row" v-if="item.material">
                <span class="detail-label">材質：</span>
                <span class="detail-value">{{ item.material }}</span>
              </div>
              <div class="detail-row" v-if="item.thickness">
                <span class="detail-label">厚度：</span>
                <span class="detail-value">{{ item.thickness }}</span>
              </div>
              <div class="detail-row" v-if="item.processing">
                <span class="detail-label">加工：</span>
                <span class="detail-value">{{ item.processing }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">數量：</span>
                <span class="detail-value">{{ item.quantity }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">單價：</span>
                <span class="detail-value">NT$ {{ Number(item.unitPrice).toLocaleString('zh-TW') }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">小計：</span>
                <span class="detail-value highlight">
                  NT$ {{ Number(item.unitPrice * item.quantity).toLocaleString('zh-TW') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { PageHeader, StatusBadge, TableHeader } from '@/components';
import { quoteService, type Quote } from '@/services/crm/quote.service';
import { quoteItemService, type QuoteItem } from '@/services/crm/quote.service';

const route = useRoute();
const router = useRouter();

const quote = ref<Quote | null>(null);
const quoteItems = ref<QuoteItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// 載入報價單資料
const loadQuote = async () => {
  const quoteId = Number(route.params.id);
  if (!quoteId) {
    error.value = '無效的報價單編號';
    return;
  }

  loading.value = true;
  error.value = null;
  
  try {
    // 載入報價單詳細資料
    quote.value = await quoteService.getById(quoteId);
    
    // 載入報價單工件列表
    quoteItems.value = await quoteItemService.getAll(quoteId);
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入報價單資料失敗';
    console.error('Failed to load quote:', err);
  } finally {
    loading.value = false;
  }
};

// 返回上一頁
const goBack = () => {
  router.push('/crm/quotes');
};

// 初始化
onMounted(() => {
  loadQuote();
});
</script>

<style scoped>
.quote-items-page {
  max-width: 1400px;
  margin: 0 auto;
}

.loading-message,
.error-message {
  padding: 2rem;
  text-align: center;
}

.error-message {
  color: var(--danger-600);
  background: var(--danger-50);
  border-radius: var(--border-radius-lg);
}

.quote-items-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.quote-details-card,
.quote-items-card {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.details-content {
  padding: 2rem;
}

.details-section {
  margin-bottom: 2rem;
}

.details-section:last-child {
  margin-bottom: 0;
}

.details-section h4 {
  margin-bottom: 1rem;
  color: var(--secondary-900);
  font-size: var(--font-size-lg);
  border-bottom: 2px solid var(--secondary-200);
  padding-bottom: 0.5rem;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.details-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.details-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
  font-weight: 500;
}

.details-value {
  font-size: var(--font-size-base);
  color: var(--secondary-900);
}

.details-value.highlight {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--primary-600);
}

.details-section p {
  color: var(--secondary-700);
  line-height: 1.6;
  margin: 0;
}

/* 報價單工件列表 */
.quote-items-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 2rem;
}

.empty-message {
  padding: 3rem;
  text-align: center;
  color: var(--secondary-500);
  font-size: var(--font-size-base);
}

.quote-item-card {
  background: var(--secondary-50);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  border: 1px solid var(--secondary-200);
  transition: box-shadow 0.2s ease;
}

.quote-item-card:hover {
  box-shadow: var(--shadow-md);
}

.quote-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--secondary-200);
}

.quote-item-title {
  font-weight: 600;
  font-size: var(--font-size-lg);
  color: var(--secondary-900);
}

.quote-item-amount {
  font-weight: 600;
  font-size: var(--font-size-lg);
  color: var(--primary-600);
}

.quote-item-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  gap: 0.5rem;
}

.detail-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
  font-weight: 500;
  min-width: 80px;
}

.detail-value {
  font-size: var(--font-size-sm);
  color: var(--secondary-900);
}

.detail-value.highlight {
  font-weight: 600;
  color: var(--primary-600);
}

.btn-icon {
  margin-right: 0.5rem;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .details-grid {
    grid-template-columns: 1fr;
  }

  .quote-item-details {
    grid-template-columns: 1fr;
  }

  .quote-item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>




