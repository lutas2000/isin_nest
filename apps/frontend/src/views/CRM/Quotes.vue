<template>
  <div class="quotes-page">
    <PageHeader 
      title="報價單管理" 
      description="管理客戶報價單、追蹤報價狀態和處理報價流程"
    >
      <template #actions>
        <button class="btn btn-primary" @click="showCreateModal = true">
          <span class="btn-icon">💰</span>
          新增報價單
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
        label="待簽名"
        variant="warning"
      />
      <OverviewCard
        icon="✅"
        :value="quotesStats.signedQuotes"
        label="已簽名"
        variant="info"
      />
    </div>

    <!-- 報價單列表 -->
    <div class="quotes-content">
      <SearchFilters
        title="報價單列表"
        :show-search="true"
        search-placeholder="搜尋報價單編號或客戶..."
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
        :show-date-filter="false"
        v-model:search="quoteSearch"
        @update:filter="handleFilterUpdate"
      />

      <div v-if="loading" class="loading-message">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <DataTable
        v-else
        :columns="tableColumns"
        :data="filteredQuotes"
        :show-actions="true"
      >
        <template #cell-customer="{ row }">
          {{ row.customer?.companyName || row.customer?.companyShortName || '未指定' }}
        </template>

        <template #cell-staff="{ row }">
          {{ row.staff?.name || '未知' }}
        </template>

        <template #cell-status="{ row }">
          <StatusBadge 
            :text="row.isSigned ? '已簽名' : '待簽名'" 
            :variant="row.isSigned ? 'success' : 'warning'"
          />
        </template>
        
        <template #cell-totalAmount="{ value }">
          NT$ {{ Number(value).toLocaleString('zh-TW') }}
        </template>

        <template #cell-createdAt="{ value }">
          {{ value ? new Date(value).toLocaleDateString('zh-TW') : '' }}
        </template>
        
        <template #actions="{ row }">
          <button class="btn btn-sm btn-outline" @click="viewDetails(row)">查看</button>
          <button class="btn btn-sm btn-primary" @click="editQuote(row)">編輯</button>
          <button 
            class="btn btn-sm btn-success" 
            v-if="row.isSigned"
            @click="convertToWorkOrder(row.id)"
          >
            轉工單
          </button>
          <button class="btn btn-sm btn-danger" @click="deleteQuote(row.id)">刪除</button>
        </template>
      </DataTable>
    </div>

    <!-- 創建/編輯報價單 Modal -->
    <Modal v-if="showCreateModal" @close="closeModal" :large="true">
      <template #title>{{ editingQuote ? '編輯報價單' : '新增報價單' }}</template>
      <template #body>
        <div class="modal-form">
          <div class="form-row">
            <div class="form-group">
              <label>經手人 *</label>
              <select 
                class="form-control" 
                v-model="quoteForm.staffId"
              >
                <option value="">請選擇經手人</option>
                <option 
                  v-for="staff in staffList" 
                  :key="staff.id" 
                  :value="staff.id"
                >
                  {{ staff.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>客戶</label>
              <select 
                class="form-control" 
                v-model="quoteForm.customerId"
              >
                <option value="">請選擇客戶（可選）</option>
                <option 
                  v-for="customer in customers" 
                  :key="customer.id" 
                  :value="customer.id"
                >
                  {{ customer.companyName }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>總計金額</label>
              <input 
                type="number" 
                class="form-control" 
                v-model="quoteForm.totalAmount"
                placeholder="0"
              />
            </div>
            <div class="form-group">
              <label>是否簽名</label>
              <select 
                class="form-control" 
                v-model="quoteForm.isSigned"
              >
                <option :value="false">待簽名</option>
                <option :value="true">已簽名</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>注意事項</label>
            <textarea 
              class="form-control" 
              v-model="quoteForm.notes"
              rows="3"
              placeholder="請輸入注意事項"
            ></textarea>
          </div>
        </div>
      </template>
      <template #footer>
        <button class="btn btn-outline" @click="closeModal">取消</button>
        <button 
          class="btn btn-primary" 
          @click="saveQuote" 
          :disabled="!isFormValid"
        >
          {{ editingQuote ? '更新' : '建立' }}
        </button>
      </template>
    </Modal>

    <!-- 查看詳情 Modal -->
    <Modal v-if="showDetailsModal && selectedQuote" @close="showDetailsModal = false" :large="true">
      <template #title>報價單詳情 #{{ selectedQuote.id }}</template>
      <template #body>
        <div class="details-content">
          <div class="details-section">
            <h4>基本資訊</h4>
            <div class="details-grid">
              <div class="details-item">
                <span class="details-label">報價單編號：</span>
                <span class="details-value">{{ selectedQuote.id }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">經手人：</span>
                <span class="details-value">{{ selectedQuote.staff?.name || '未知' }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">客戶：</span>
                <span class="details-value">
                  {{ selectedQuote.customer?.companyName || selectedQuote.customer?.companyShortName || '未指定' }}
                </span>
              </div>
              <div class="details-item">
                <span class="details-label">狀態：</span>
                <span class="details-value">
                  <StatusBadge 
                    :text="selectedQuote.isSigned ? '已簽名' : '待簽名'" 
                    :variant="selectedQuote.isSigned ? 'success' : 'warning'"
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
                <span class="details-value">NT$ {{ Number(selectedQuote.totalAmount).toLocaleString('zh-TW') }}</span>
              </div>
            </div>
          </div>

          <div class="details-section" v-if="selectedQuote.notes">
            <h4>注意事項</h4>
            <p>{{ selectedQuote.notes }}</p>
          </div>

          <div class="details-section">
            <h4>時間資訊</h4>
            <div class="details-grid">
              <div class="details-item">
                <span class="details-label">建立時間：</span>
                <span class="details-value">
                  {{ selectedQuote.createdAt ? new Date(selectedQuote.createdAt).toLocaleString('zh-TW') : '未知' }}
                </span>
              </div>
              <div class="details-item" v-if="selectedQuote.updatedAt">
                <span class="details-label">更新時間：</span>
                <span class="details-value">
                  {{ new Date(selectedQuote.updatedAt).toLocaleString('zh-TW') }}
                </span>
              </div>
            </div>
          </div>

          <div class="details-section" v-if="selectedQuote.quoteItems && selectedQuote.quoteItems.length > 0">
            <h4>報價單工件</h4>
            <div class="quote-items-list">
              <div 
                class="quote-item-card" 
                v-for="item in selectedQuote.quoteItems" 
                :key="item.id"
              >
                <div class="quote-item-header">
                  <span class="quote-item-title">工件 #{{ item.id }}</span>
                  <span class="quote-item-amount">NT$ {{ Number(item.unitPrice * item.quantity).toLocaleString('zh-TW') }}</span>
                </div>
                <div class="quote-item-details">
                  <div v-if="item.customerFile">客戶圖檔：{{ item.customerFile }}</div>
                  <div v-if="item.material">材質：{{ item.material }}</div>
                  <div v-if="item.thickness">厚度：{{ item.thickness }}</div>
                  <div v-if="item.processing">加工：{{ item.processing }}</div>
                  <div>數量：{{ item.quantity }}</div>
                  <div>單價：NT$ {{ Number(item.unitPrice).toLocaleString('zh-TW') }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { PageHeader, OverviewCard, DataTable, SearchFilters, StatusBadge, Modal } from '@/components';
import { quoteService, type Quote } from '@/services/crm/quote.service';
import { customerService, type Customer } from '@/services/crm/customer.service';

// 報價單資料
const quotes = ref<Quote[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const quoteSearch = ref('');
const quoteStatusFilter = ref('');

// 客戶和員工資料（用於下拉選單）
const customers = ref<Customer[]>([]);
const staffList = ref<any[]>([]); // 需要從 HR 模組獲取員工資料

// Modal 控制
const showCreateModal = ref(false);
const showDetailsModal = ref(false);
const editingQuote = ref<Quote | null>(null);
const selectedQuote = ref<Quote | null>(null);

// 表單資料
const quoteForm = ref({
  staffId: '',
  customerId: '',
  totalAmount: 0,
  notes: '',
  isSigned: false,
});

// 報價統計
const quotesStats = computed(() => {
  const total = quotes.value.length;
  const totalValue = quotes.value.reduce((sum, q) => sum + Number(q.totalAmount), 0);
  const pendingQuotes = quotes.value.filter(q => !q.isSigned).length;
  const signedQuotes = quotes.value.filter(q => q.isSigned).length;
  
  return {
    totalQuotes: total,
    totalValue: totalValue.toLocaleString('zh-TW'),
    pendingQuotes,
    signedQuotes,
  };
});

// 表格列定義
const tableColumns = [
  { key: 'id', label: '報價單編號' },
  { key: 'customer', label: '客戶' },
  { key: 'staff', label: '經手人' },
  { key: 'totalAmount', label: '總金額' },
  { key: 'status', label: '狀態' },
  { key: 'createdAt', label: '建立日期' },
];

// 篩選後的報價單
const filteredQuotes = computed(() => {
  let filtered = quotes.value;

  // 文字搜尋
  if (quoteSearch.value) {
    const search = quoteSearch.value.toLowerCase();
    filtered = filtered.filter(
      (quote) =>
        quote.id.toString().includes(search) ||
        quote.customer?.companyName?.toLowerCase().includes(search) ||
        quote.customer?.companyShortName?.toLowerCase().includes(search),
    );
  }

  // 狀態篩選
  if (quoteStatusFilter.value === 'signed') {
    filtered = filtered.filter((quote) => quote.isSigned);
  } else if (quoteStatusFilter.value === 'pending') {
    filtered = filtered.filter((quote) => !quote.isSigned);
  }

  return filtered;
});

// 表單驗證
const isFormValid = computed(() => {
  return quoteForm.value.staffId;
});

// 處理篩選器更新
const handleFilterUpdate = (key: string, value: string) => {
  if (key === 'status') {
    quoteStatusFilter.value = value;
  }
};

// 載入報價單資料
const loadQuotes = async () => {
  loading.value = true;
  error.value = null;
  try {
    quotes.value = await quoteService.getAll();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入報價單失敗';
    console.error('Failed to load quotes:', err);
  } finally {
    loading.value = false;
  }
};

// 載入客戶資料
const loadCustomers = async () => {
  try {
    customers.value = await customerService.getAll();
  } catch (err) {
    console.error('Failed to load customers:', err);
  }
};

// 載入員工資料（暫時使用空陣列，需要實作 HR API）
const loadStaff = async () => {
  try {
    // TODO: 實作從 HR 模組獲取員工資料
    // staffList.value = await staffService.getAll();
    staffList.value = [];
  } catch (err) {
    console.error('Failed to load staff:', err);
  }
};

// 查看詳情
const viewDetails = async (quote: Quote) => {
  try {
    // 獲取完整的報價單資料（包含關聯的 quoteItems）
    selectedQuote.value = await quoteService.getById(quote.id);
    showDetailsModal.value = true;
  } catch (err) {
    alert(err instanceof Error ? err.message : '載入報價單詳情失敗');
  }
};

// 編輯報價單
const editQuote = (quote: Quote) => {
  editingQuote.value = quote;
  quoteForm.value = {
    staffId: quote.staffId,
    customerId: quote.customerId || '',
    totalAmount: Number(quote.totalAmount),
    notes: quote.notes || '',
    isSigned: quote.isSigned,
  };
  showCreateModal.value = true;
};

// 儲存報價單
const saveQuote = async () => {
  if (!isFormValid.value) {
    alert('請填寫必填欄位');
    return;
  }

  try {
    const data: Partial<Quote> = {
      staffId: quoteForm.value.staffId,
      customerId: quoteForm.value.customerId || undefined,
      totalAmount: quoteForm.value.totalAmount,
      notes: quoteForm.value.notes || undefined,
      isSigned: quoteForm.value.isSigned,
    };

    if (editingQuote.value) {
      await quoteService.update(editingQuote.value.id, data);
    } else {
      await quoteService.create(data);
    }

    closeModal();
    await loadQuotes();
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存報價單失敗');
  }
};

// 刪除報價單
const deleteQuote = async (id: number) => {
  if (!confirm('確定要刪除此報價單嗎？此操作無法復原。')) return;
  
  try {
    await quoteService.delete(id);
    await loadQuotes();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除報價單失敗');
  }
};

// 轉換為工單
const convertToWorkOrder = async (id: number) => {
  if (!confirm('確定要將此報價單轉換為工單嗎？')) return;
  
  try {
    await quoteService.convertToWorkOrder(id);
    alert('成功轉換為工單！');
    await loadQuotes();
  } catch (err) {
    alert(err instanceof Error ? err.message : '轉換失敗，請確認報價單已簽名');
  }
};

// 關閉 Modal
const closeModal = () => {
  showCreateModal.value = false;
  editingQuote.value = null;
  quoteForm.value = {
    staffId: '',
    customerId: '',
    totalAmount: 0,
    notes: '',
    isSigned: false,
  };
};

// 初始化
onMounted(() => {
  loadCustomers();
  loadStaff();
  loadQuotes();
});
</script>

<style scoped>
.quotes-page {
  max-width: 1400px;
  margin: 0 auto;
}

.quotes-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.quotes-content {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.loading-message,
.error-message {
  padding: 2rem;
  text-align: center;
}

.error-message {
  color: var(--danger-600);
  background: var(--danger-50);
}

.btn-icon {
  margin-right: 0.5rem;
}

/* Modal 表單樣式 */
.modal-form {
  max-height: 60vh;
  overflow-y: auto;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--secondary-700);
  font-size: var(--font-size-sm);
}

.form-control {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-500);
}

select.form-control {
  cursor: pointer;
}

textarea.form-control {
  resize: vertical;
}

/* 詳情 Modal 樣式 */
.details-content {
  max-height: 60vh;
  overflow-y: auto;
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

.details-section p {
  color: var(--secondary-700);
  line-height: 1.6;
}

/* 報價單工件列表 */
.quote-items-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.quote-item-card {
  background: var(--secondary-50);
  border-radius: var(--border-radius);
  padding: 1rem;
  border: 1px solid var(--secondary-200);
}

.quote-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.quote-item-title {
  font-weight: 600;
  color: var(--secondary-900);
}

.quote-item-amount {
  font-weight: 600;
  color: var(--primary-600);
}

.quote-item-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: var(--font-size-sm);
  color: var(--secondary-700);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .quotes-overview {
    grid-template-columns: repeat(2, 1fr);
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .quotes-overview {
    grid-template-columns: 1fr;
  }
}
</style>
