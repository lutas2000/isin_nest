<template>
  <div class="quotes-page">
    <PageHeader 
      title="報價單管理" 
      description="管理客戶報價單、追蹤報價狀態和處理報價流程"
    >
      <template #actions>
        <button class="btn btn-primary" @click="showNewRow = true">
          <span class="btn-icon">💰</span>
          新增報價單
        </button>
      </template>
    </PageHeader>

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
      <EditableDataTable
        v-else
        :columns="editableColumns"
        :data="filteredQuotes"
        :show-actions="true"
        :pagination="true"
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        :editable="true"
        :show-new-row="showNewRow"
        :new-row-template="newRowTemplate"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
        @field-change="handleFieldChange"
        @save="handleSave"
        @new-row-save="handleNewRowSave"
        @new-row-cancel="showNewRow = false"
        @row-delete="handleRowDelete"
        @row-view="handleRowView"
        @row-edit="handleRowEdit"
      >
        <template #cell-id="{ row, value }">
          <button 
            v-if="value" 
            class="link-button" 
            type="button" 
            @click="viewDetails(row)"
          >
            {{ value }}
          </button>
          <span v-else class="text-muted">待生成</span>
        </template>

        <template #cell-customerId="{ row, value }">
          <span v-if="!row.customerId">未指定</span>
          <span 
            v-else 
            :title="row.customer?.companyName || row.customer?.companyShortName || value"
          >
            {{ value }}
          </span>
        </template>

        <template #cell-staffId="{ row, value }">
          <span v-if="!row.staffId">未知</span>
          <span v-else>{{ row.staff?.name || value }}</span>
        </template>

        <template #cell-isSigned="{ row, value }">
          <StatusBadge 
            :text="value ? '已簽名' : '待簽名'" 
            :variant="value ? 'success' : 'warning'"
          />
        </template>
        
        <template #cell-totalAmount="{ value }">
          NT$ {{ Number(value || 0).toLocaleString('zh-TW') }}
        </template>

        <template #cell-notes="{ value }">
          <span v-if="value && value.length > 50" :title="value">
            {{ value.substring(0, 50) }}...
          </span>
          <span v-else>{{ value || '' }}</span>
        </template>

        <template #cell-createdAt="{ value }">
          {{ value ? new Date(value).toLocaleDateString('zh-TW') : '' }}
        </template>
        
        <template #actions="{ row, isEditing, save, cancel }">
          <!-- 編輯模式：顯示保存和取消按鈕 -->
          <template v-if="isEditing">
            <button 
              class="btn btn-sm btn-success" 
              @click="save"
            >
              保存
            </button>
            <button 
              class="btn btn-sm btn-outline" 
              @click="cancel"
            >
              取消
            </button>
          </template>
          <!-- 非編輯模式：顯示原有按鈕 -->
          <template v-else>
            <button 
              v-if="row.isSigned"
              class="btn btn-sm btn-success" 
              @click="convertToWorkOrder(row.id)"
            >
              轉工單
            </button>
            <button 
              class="btn btn-sm btn-danger" 
              @click="deleteQuote(row.id)"
            >
              刪除
            </button>
          </template>
        </template>
      </EditableDataTable>
    </div>

    <!-- 查看詳情 Modal -->
    <Modal 
      v-if="selectedQuote"
      :show="showDetailsModal" 
      :title="`報價單詳情 #${selectedQuote.id}`"
      @close="showDetailsModal = false"
    >
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
                  {{ selectedQuote.customer?.companyShortName || '未指定' }}
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
            <h4>備註</h4>
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
    </Modal>

    <!-- 轉工單 Modal -->
    <Modal 
      :show="showConvertModal" 
      title="轉換為工單"
      @close="closeConvertModal"
    >
      <div class="modal-form">
        <div class="form-row">
          <div class="form-group">
            <label>運送方式 *</label>
            <select 
              class="form-control" 
              v-model="convertForm.shippingMethod"
            >
              <option value="">請選擇運送方式</option>
              <option value="自取">自取</option>
              <option value="快遞">快遞</option>
              <option value="貨運">貨運</option>
            </select>
          </div>
          <div class="form-group">
            <label>付款方式 *</label>
            <select 
              class="form-control" 
              v-model="convertForm.paymentMethod"
            >
              <option value="">請選擇付款方式</option>
              <option value="現金">現金</option>
              <option value="轉帳">轉帳</option>
              <option value="月結">月結</option>
            </select>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-outline" @click="closeConvertModal">取消</button>
        <button 
          class="btn btn-primary" 
          @click="confirmConvertToWorkOrder" 
          :disabled="!isConvertFormValid"
        >
          確認轉換
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { PageHeader, EditableDataTable, type EditableColumn, SearchFilters, StatusBadge, Modal } from '@/components';
import { quoteService, type Quote } from '@/services/crm/quote.service';
import { customerService, type Customer } from '@/services/crm/customer.service';
import { apiGet } from '@/services/api';
import { useAuthStore } from '@/stores/auth';

// 報價單資料
const quotes = ref<Quote[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// 分頁狀態
const currentPage = ref(1);
const pageSize = ref(50);
const total = ref(0);
const quoteSearch = ref('');
const quoteStatusFilter = ref('');

// 客戶和員工資料（用於下拉選單）
const customers = ref<Customer[]>([]);

// 員工類型定義
interface Staff {
  id: string;
  name: string;
  department?: string;
  [key: string]: any;
}

const staffList = ref<Staff[]>([]); // 銷管部員工列表

// 認證 store
const authStore = useAuthStore();

// 路由
const router = useRouter();

// Modal 控制
const showDetailsModal = ref(false);
const showConvertModal = ref(false);
const selectedQuote = ref<Quote | null>(null);
const convertingQuoteId = ref<string | null>(null);
const showNewRow = ref(false);

// 新增行模板
const newRowTemplate = () => ({
  staffId: authStore.staffId || '',
  customerId: '',
  totalAmount: 0,
  notes: '',
  isSigned: false,
});

// 轉工單表單資料
const convertForm = ref({
  shippingMethod: '',
  paymentMethod: '',
});

// 可編輯表格列定義
const editableColumns = computed<EditableColumn[]>(() => [
  { 
    key: 'id', 
    label: '報價單編號', 
    editable: false 
  },
  { 
    key: 'customerId', 
    label: '客戶', 
    editable: true, 
    required: true, 
    type: 'search-select',
    searchFunction: async (searchTerm: string) => {
      try {
        const response = await customerService.getAll(undefined, undefined, searchTerm);
        const customerList = Array.isArray(response) ? response : (response as any).data || [];
        return customerList.map((c: Customer) => {
          // 顯示格式：ID(簡稱)
          const shortName = c.companyShortName || '';
          const label = shortName ? `${c.id}(${shortName})` : c.id;
          return {
            value: c.id,
            label: label
          };
        });
      } catch (err) {
        console.error('Failed to search customers:', err);
        return [];
      }
    }
  },
  { 
    key: 'staffId', 
    label: '經手人', 
    editable: true, 
    required: true, 
    type: 'search-select',
    searchFunction: async (searchTerm: string) => {
      try {
        const params: Record<string, any> = { department: '銷管部' };
        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }
        const staffList = await apiGet<Staff[]>('/staffs/all', params);
        return staffList.map(s => ({ value: s.id, label: s.name }));
      } catch (err) {
        console.error('Failed to search staff:', err);
        return [];
      }
    }
  },
  { 
    key: 'totalAmount', 
    label: '總金額', 
    editable: false, 
    type: 'number' 
  },
  { 
    key: 'isSigned', 
    label: '是否簽名', 
    editable: true, 
    type: 'select',
    options: [
      { value: false, label: '待簽名' },
      { value: true, label: '已簽名' }
    ]
  },
  { 
    key: 'notes', 
    label: '備註', 
    editable: true, 
    type: 'text',
    truncate: true
  },
  { 
    key: 'createdAt', 
    label: '建立日期', 
    editable: false 
  },
]);

// 篩選後的報價單
const filteredQuotes = computed(() => {
  let filtered = quotes.value;

  // 文字搜尋
  if (quoteSearch.value) {
    const search = quoteSearch.value.toLowerCase();
      filtered = filtered.filter(
        (quote) =>
          quote.id.toString().includes(search) ||
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
    const response = await quoteService.getAll(currentPage.value, pageSize.value);
    // 檢查是否為分頁回應
    if (response && typeof response === 'object' && 'data' in response) {
      quotes.value = response.data;
      total.value = response.total;
    } else {
      // 向後兼容：如果不是分頁回應，直接使用數組
      quotes.value = response as Quote[];
      total.value = quotes.value.length;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入報價單失敗';
    console.error('Failed to load quotes:', err);
  } finally {
    loading.value = false;
  }
};

// 處理分頁變化
const handlePageChange = (page: number) => {
  currentPage.value = page;
  loadQuotes();
};

const handlePageSizeChange = (newSize: number) => {
  pageSize.value = newSize;
  currentPage.value = 1;
  loadQuotes();
};

// 載入客戶資料
const loadCustomers = async () => {
  try {
    const response = await customerService.getAll();
    // 處理分頁回應或直接數組
    if (response && typeof response === 'object' && 'data' in response) {
      customers.value = response.data;
    } else {
      customers.value = response as Customer[];
    }
  } catch (err) {
    console.error('Failed to load customers:', err);
  }
};

// 載入員工資料（只顯示銷管部的員工）
const loadStaff = async () => {
  try {
    const salesStaff = await apiGet<Staff[]>('/staffs/all?department=銷管部');
    staffList.value = salesStaff;
  } catch (err) {
    console.error('Failed to load staff:', err);
    staffList.value = [];
  }
};

// 查看詳情（導航到 QuoteItems 頁面）
const viewDetails = (quote: Quote) => {
  router.push(`/crm/quotes/${quote.id}/items`);
};

// 處理欄位變更（僅更新本地狀態，不自動保存）
const handleFieldChange = (row: Quote, field: string, value: any, isNew: boolean) => {
  // 只更新本地狀態，不觸發自動保存
  // 保存將在 Enter 或 blur 時觸發
};

// 處理手動保存
const handleSave = async (row: Quote, isNew: boolean) => {
  try {
    if (isNew) {
      const data: Partial<Quote> = {
        staffId: row.staffId,
        customerId: row.customerId,
        totalAmount: row.totalAmount || 0,
        notes: row.notes || undefined,
        isSigned: row.isSigned || false,
      };
      await quoteService.create(data);
      await loadQuotes();
    } else {
      const data: Partial<Quote> = {
        staffId: row.staffId,
        customerId: row.customerId,
        totalAmount: row.totalAmount || 0,
        notes: row.notes || undefined,
        isSigned: row.isSigned || false,
      };
      await quoteService.update(row.id, data);
      await loadQuotes();
    }
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存報價單失敗');
  }
};

// 處理新增行保存
const handleNewRowSave = async (row: any) => {
  try {
    const data: Partial<Quote> = {
      staffId: row.staffId,
      customerId: row.customerId,
      totalAmount: row.totalAmount || 0,
      notes: row.notes || undefined,
      isSigned: row.isSigned || false,
    };
    await quoteService.create(data);
    showNewRow.value = false;
    await loadQuotes();
  } catch (err) {
    alert(err instanceof Error ? err.message : '建立報價單失敗');
  }
};

// 刪除報價單
const deleteQuote = async (id: string) => {
  if (!confirm('確定要刪除此報價單嗎？此操作無法復原。')) return;
  
  try {
    await quoteService.delete(id);
    await loadQuotes();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除報價單失敗');
  }
};

// 處理 row-delete 事件（快捷鍵觸發）
const handleRowDelete = async (row: Quote) => {
  if (!confirm('確定要刪除此報價單嗎？此操作無法復原。')) return;
  
  try {
    await quoteService.delete(row.id);
    await loadQuotes();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除報價單失敗');
  }
};

// 處理 row-view 事件（快捷鍵觸發）
const handleRowView = (row: Quote) => {
  viewDetails(row);
};

// 處理 row-edit 事件（快捷鍵觸發，F2）
const handleRowEdit = (row: Quote, index: number) => {
  // 編輯狀態會由 EditableDataTable 內部處理
  // 這裡可以加入額外的邏輯，例如記錄編輯歷史等
};

// 轉換為工單 - 打開 modal
const convertToWorkOrder = (id: string) => {
  convertingQuoteId.value = id;
  convertForm.value = {
    shippingMethod: '',
    paymentMethod: '',
  };
  showConvertModal.value = true;
};

// 確認轉換為工單
const confirmConvertToWorkOrder = async () => {
  if (!isConvertFormValid.value || !convertingQuoteId.value) {
    alert('請選擇運送方式和付款方式');
    return;
  }

  try {
    await quoteService.convertToWorkOrder(
      convertingQuoteId.value,
      convertForm.value.shippingMethod,
      convertForm.value.paymentMethod
    );
    alert('成功轉換為工單！');
    closeConvertModal();
    await loadQuotes();
  } catch (err) {
    alert(err instanceof Error ? err.message : '轉換失敗，請確認報價單已簽名');
  }
};

// 關閉轉工單 Modal
const closeConvertModal = () => {
  showConvertModal.value = false;
  convertingQuoteId.value = null;
  convertForm.value = {
    shippingMethod: '',
    paymentMethod: '',
  };
};

// 轉工單表單驗證
const isConvertFormValid = computed(() => {
  return convertForm.value.shippingMethod !== '' && convertForm.value.paymentMethod !== '';
});


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

.link-button {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  color: var(--primary-600);
  text-decoration: underline;
  cursor: pointer;
  font: inherit;
}

.link-button:hover {
  color: var(--primary-700);
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

.form-control:disabled {
  background-color: var(--secondary-100);
  cursor: not-allowed;
}

.form-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: var(--font-size-xs);
  color: var(--secondary-600);
}

.form-error {
  display: block;
  margin-top: 0.25rem;
  font-size: var(--font-size-xs);
  color: var(--danger-600);
}

.form-control-error {
  border-color: var(--danger-500);
}

.form-control-error:focus {
  border-color: var(--danger-600);
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
