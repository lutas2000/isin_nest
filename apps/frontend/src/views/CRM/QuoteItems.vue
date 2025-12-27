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
        <TableHeader title="報價單工件列表">
          <template #actions>
            <button class="btn btn-primary" @click="openCreateModal">
              <span class="btn-icon">➕</span>
              新增工件
            </button>
          </template>
        </TableHeader>
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
              <div class="quote-item-header-right">
                <span class="quote-item-amount">
                  NT$ {{ Number(item.unitPrice * item.quantity).toLocaleString('zh-TW') }}
                </span>
                <div class="quote-item-actions">
                  <button class="btn btn-sm btn-primary" @click="editItem(item)">編輯</button>
                  <button class="btn btn-sm btn-danger" @click="deleteItem(item.id)">刪除</button>
                </div>
              </div>
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

    <!-- 新增/編輯工件 Modal -->
    <Modal 
      :show="showItemModal" 
      :title="editingItem ? '編輯工件' : '新增工件'"
      @close="closeItemModal"
    >
      <div class="modal-form">
        <div class="form-row">
          <div class="form-group">
            <label>客戶圖檔</label>
            <input 
              type="text" 
              class="form-control" 
              v-model="itemForm.customerFile"
              placeholder="請輸入客戶圖檔名稱"
            />
          </div>
          <div class="form-group">
            <label>材質</label>
            <input 
              type="text" 
              class="form-control" 
              v-model="itemForm.material"
              placeholder="請輸入材質"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>厚度</label>
            <input 
              type="text" 
              class="form-control" 
              v-model="itemForm.thickness"
              placeholder="例如：3mm"
            />
          </div>
          <div class="form-group">
            <label>加工</label>
            <input 
              type="text" 
              class="form-control" 
              v-model="itemForm.processing"
              placeholder="請輸入加工方式"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>數量 *</label>
            <input 
              type="number" 
              class="form-control" 
              v-model.number="itemForm.quantity"
              placeholder="0"
              min="0"
            />
          </div>
          <div class="form-group">
            <label>單價 *</label>
            <input 
              type="number" 
              class="form-control" 
              v-model.number="itemForm.unitPrice"
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn btn-outline" @click="closeItemModal">取消</button>
        <button 
          class="btn btn-primary" 
          @click="saveItem" 
          :disabled="!isItemFormValid"
        >
          {{ editingItem ? '更新' : '建立' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { PageHeader, StatusBadge, TableHeader, Modal } from '@/components';
import { quoteService, type Quote } from '@/services/crm/quote.service';
import { quoteItemService, type QuoteItem } from '@/services/crm/quote.service';

const route = useRoute();
const router = useRouter();

const quote = ref<Quote | null>(null);
const quoteItems = ref<QuoteItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// Modal 控制
const showItemModal = ref(false);
const editingItem = ref<QuoteItem | null>(null);

// 表單資料
const itemForm = ref({
  customerFile: '',
  material: '',
  thickness: '',
  processing: '',
  quantity: 0,
  unitPrice: 0,
});

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

// 表單驗證
const isItemFormValid = computed(() => {
  return itemForm.value.quantity > 0 && itemForm.value.unitPrice >= 0;
});

// 打開新增 Modal
const openCreateModal = () => {
  editingItem.value = null;
  itemForm.value = {
    customerFile: '',
    material: '',
    thickness: '',
    processing: '',
    quantity: 0,
    unitPrice: 0,
  };
  showItemModal.value = true;
};

// 編輯工件
const editItem = (item: QuoteItem) => {
  editingItem.value = item;
  itemForm.value = {
    customerFile: item.customerFile || '',
    material: item.material || '',
    thickness: item.thickness || '',
    processing: item.processing || '',
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
  };
  showItemModal.value = true;
};

// 儲存工件
const saveItem = async () => {
  if (!isItemFormValid.value) {
    alert('請填寫必填欄位（數量和單價）');
    return;
  }

  if (!quote.value) {
    alert('報價單資料不存在');
    return;
  }

  try {
    const data: Partial<QuoteItem> = {
      quoteId: quote.value.id,
      customerFile: itemForm.value.customerFile || undefined,
      material: itemForm.value.material || undefined,
      thickness: itemForm.value.thickness || undefined,
      processing: itemForm.value.processing || undefined,
      quantity: itemForm.value.quantity,
      unitPrice: itemForm.value.unitPrice,
    };

    if (editingItem.value) {
      await quoteItemService.update(editingItem.value.id, data);
    } else {
      await quoteItemService.create(data);
    }

    closeItemModal();
    await loadQuote();
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存工件失敗');
  }
};

// 刪除工件
const deleteItem = async (id: number) => {
  if (!confirm('確定要刪除此工件嗎？此操作無法復原。')) return;
  
  try {
    await quoteItemService.delete(id);
    await loadQuote();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除工件失敗');
  }
};

// 關閉 Modal
const closeItemModal = () => {
  showItemModal.value = false;
  editingItem.value = null;
  itemForm.value = {
    customerFile: '',
    material: '',
    thickness: '',
    processing: '',
    quantity: 0,
    unitPrice: 0,
  };
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

.quote-item-header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.quote-item-amount {
  font-weight: 600;
  font-size: var(--font-size-lg);
  color: var(--primary-600);
}

.quote-item-actions {
  display: flex;
  gap: 0.5rem;
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

  .quote-item-header-right {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    width: 100%;
  }

  .quote-item-actions {
    width: 100%;
  }

  .quote-item-actions .btn {
    flex: 1;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>




