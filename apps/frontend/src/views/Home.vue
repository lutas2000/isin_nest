<template>
  <div class="home-page">
    <!-- NAS 狀態 -->
    <div class="section-card nas-status-card">
      <div class="section-header">
        <h3>NAS 掛載狀態</h3>
      </div>
      <div class="section-body">
        <div class="nas-indicator">
          <span
            class="status-dot"
            :class="nasLoading ? 'loading' : nasMounted ? 'online' : 'offline'"
          ></span>
          <span class="nas-text" v-if="nasLoading">檢查中...</span>
          <span class="nas-text" v-else-if="nasMounted">已掛載</span>
          <span class="nas-text" v-else>未掛載</span>
        </div>
      </div>
    </div>

    <!-- 未完成訂單 -->
    <div class="section-card">
      <div class="section-header">
        <h3>未完成訂單</h3>
      </div>
      <div class="section-body">
        <div v-if="ordersLoading" class="loading-message">載入訂單中...</div>
        <div v-else-if="ordersError" class="error-message">{{ ordersError }}</div>
        <div v-else-if="orders.length === 0" class="empty-message">目前沒有未完成的訂單</div>
        <EditableDataTable
          v-else
          :columns="orderColumns"
          :data="orders"
          :show-actions="false"
          :editable="false"
          :pagination="true"
          :current-page="orderPage"
          :page-size="orderPageSize"
          :total="orderTotal"
          @update:page="handleOrderPageChange"
          @update:page-size="handleOrderPageSizeChange"
        >
          <template #cell-customerId="{ row }">
            {{ row.customer?.companyShortName || row.customer?.companyName || row.customerId }}
          </template>
          <template #cell-staffId="{ row }">
            {{ row.staff?.name || row.staffId }}
          </template>
          <template #cell-isCompleted="{ value }">
            <StatusBadge
              :text="value ? '已完成' : '進行中'"
              :variant="value ? 'success' : 'info'"
            />
          </template>
          <template #cell-amount="{ value }">
            NT$ {{ Number(value || 0).toLocaleString('zh-TW') }}
          </template>
          <template #cell-createdAt="{ value }">
            {{ value ? new Date(value).toLocaleDateString('zh-TW') : '' }}
          </template>
        </EditableDataTable>
      </div>
    </div>

    <!-- 近 30 天未簽名報價單 -->
    <div class="section-card">
      <div class="section-header">
        <h3>近 30 天未簽名報價單</h3>
      </div>
      <div class="section-body">
        <div v-if="quotesLoading" class="loading-message">載入報價單中...</div>
        <div v-else-if="quotesError" class="error-message">{{ quotesError }}</div>
        <div v-else-if="quotes.length === 0" class="empty-message">目前沒有未簽名的報價單</div>
        <EditableDataTable
          v-else
          :columns="quoteColumns"
          :data="quotes"
          :show-actions="false"
          :editable="false"
          :pagination="true"
          :current-page="quotePage"
          :page-size="quotePageSize"
          :total="quoteTotal"
          @update:page="handleQuotePageChange"
          @update:page-size="handleQuotePageSizeChange"
        >
          <template #cell-customerId="{ row }">
            {{ row.customer?.companyShortName || row.customer?.companyName || row.customerId }}
          </template>
          <template #cell-staffId="{ row }">
            {{ row.staff?.name || row.staffId }}
          </template>
          <template #cell-isSigned="{ value }">
            <StatusBadge
              :text="value ? '已簽名' : '待簽名'"
              :variant="value ? 'success' : 'warning'"
            />
          </template>
          <template #cell-totalAmount="{ value }">
            NT$ {{ Number(value || 0).toLocaleString('zh-TW') }}
          </template>
          <template #cell-createdAt="{ value }">
            {{ value ? new Date(value).toLocaleDateString('zh-TW') : '' }}
          </template>
        </EditableDataTable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { EditableDataTable, StatusBadge } from '@/components';
import { apiGet } from '@/services/api';
import { API_CONFIG } from '@/config/api';
import { orderService, type Order } from '@/services/crm/order.service';
import { quoteService, type Quote } from '@/services/crm/quote.service';
import type { PaginatedResponse } from '@/types/pagination';

const currentDate = ref('');

// --- NAS ---
const nasMounted = ref(false);
const nasLoading = ref(true);

const checkNas = async () => {
  nasLoading.value = true;
  try {
    const result = await apiGet<{ mounted: boolean }>(API_CONFIG.HEALTH.NAS);
    nasMounted.value = result.mounted;
  } catch {
    nasMounted.value = false;
  } finally {
    nasLoading.value = false;
  }
};

// --- 未完成訂單 ---
const orders = ref<Order[]>([]);
const ordersLoading = ref(false);
const ordersError = ref<string | null>(null);
const orderPage = ref(1);
const orderPageSize = ref(50);
const orderTotal = ref(0);

const orderColumns = [
  { key: 'id', label: '訂單編號' },
  { key: 'customerId', label: '客戶' },
  { key: 'staffId', label: '業務員' },
  { key: 'amount', label: '金額' },
  { key: 'isCompleted', label: '狀態' },
  { key: 'createdAt', label: '建立日期' },
];

const loadOrders = async () => {
  ordersLoading.value = true;
  ordersError.value = null;
  try {
    const response = await orderService.getAll(orderPage.value, orderPageSize.value, { isCompleted: false });
    if (response && typeof response === 'object' && 'data' in response) {
      const paginated = response as PaginatedResponse<Order>;
      orders.value = paginated.data;
      orderTotal.value = paginated.total;
    } else {
      orders.value = response as Order[];
      orderTotal.value = orders.value.length;
    }
  } catch (err) {
    ordersError.value = err instanceof Error ? err.message : '載入訂單失敗';
  } finally {
    ordersLoading.value = false;
  }
};

const handleOrderPageChange = (page: number) => {
  orderPage.value = page;
  loadOrders();
};

const handleOrderPageSizeChange = (size: number) => {
  orderPageSize.value = size;
  orderPage.value = 1;
  loadOrders();
};

// --- 近 30 天未簽名報價單 ---
const quotes = ref<Quote[]>([]);
const quotesLoading = ref(false);
const quotesError = ref<string | null>(null);
const quotePage = ref(1);
const quotePageSize = ref(50);
const quoteTotal = ref(0);

const quoteColumns = [
  { key: 'id', label: '報價單編號' },
  { key: 'customerId', label: '客戶' },
  { key: 'staffId', label: '經手人' },
  { key: 'totalAmount', label: '總金額' },
  { key: 'isSigned', label: '簽名狀態' },
  { key: 'createdAt', label: '建立日期' },
];

const loadQuotes = async () => {
  quotesLoading.value = true;
  quotesError.value = null;
  try {
    const response = await quoteService.getAll(quotePage.value, quotePageSize.value, { isSigned: false, days: 30 });
    if (response && typeof response === 'object' && 'data' in response) {
      const paginated = response as PaginatedResponse<Quote>;
      quotes.value = paginated.data;
      quoteTotal.value = paginated.total;
    } else {
      quotes.value = response as Quote[];
      quoteTotal.value = quotes.value.length;
    }
  } catch (err) {
    quotesError.value = err instanceof Error ? err.message : '載入報價單失敗';
  } finally {
    quotesLoading.value = false;
  }
};

const handleQuotePageChange = (page: number) => {
  quotePage.value = page;
  loadQuotes();
};

const handleQuotePageSizeChange = (size: number) => {
  quotePageSize.value = size;
  quotePage.value = 1;
  loadQuotes();
};

onMounted(() => {
  const now = new Date();
  currentDate.value = now.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  checkNas();
  loadOrders();
  loadQuotes();
});
</script>

<style scoped>
.home-page {
  width: 100%;
  margin: 0 auto;
}

.section-card {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.section-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--secondary-200);
  background-color: var(--secondary-50);
}

.section-header h3 {
  margin: 0;
  color: var(--secondary-900);
}

.section-body {
  padding: 1.5rem;
}

/* NAS 狀態 */
.nas-status-card .section-body {
  padding: 1rem 1.5rem;
}

.nas-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.online {
  background-color: var(--success-500);
  box-shadow: 0 0 0 4px var(--success-100);
}

.status-dot.offline {
  background-color: var(--danger-500);
  box-shadow: 0 0 0 4px var(--danger-100);
}

.status-dot.loading {
  background-color: var(--secondary-400);
  box-shadow: 0 0 0 4px var(--secondary-100);
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.nas-text {
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--secondary-800);
}

/* 載入 / 錯誤 / 空資料 */
.loading-message,
.empty-message {
  padding: 2rem;
  text-align: center;
  color: var(--secondary-500);
}

.error-message {
  padding: 2rem;
  text-align: center;
  color: var(--danger-600);
  background: var(--danger-50);
  border-radius: var(--border-radius);
}

/* DataTable 內嵌時移除多餘外框 */
.section-body :deep(.data-table) {
  box-shadow: none;
  border-radius: 0;
}

@media (max-width: 768px) {
  .section-body {
    padding: 1rem;
  }
}
</style>
