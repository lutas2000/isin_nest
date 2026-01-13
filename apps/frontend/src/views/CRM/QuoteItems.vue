<template>
  <div class="quote-items-page">
    <PageHeader 
      title="報價單詳情" 
      :description="quote ? `` : '載入中...'"
    >
      <template #actions>
        <button class="btn btn-primary" @click="handlePrint" v-if="quote">
          <span class="btn-icon">🖨️</span>
          列印
        </button>
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

      <!-- 快捷鍵提示 -->
    <ShortcutHint 
      :table-state="tableState" 
      @shortcut-click="handleShortcutClick"
    />

      <!-- 報價單工件列表 -->
      <div class="quote-items-card">
        <TableHeader title="報價單工件列表">
          <template #actions>
            <button class="btn btn-primary" @click="showNewRow = true">
              <span class="btn-icon">➕</span>
              新增工件
            </button>
          </template>
        </TableHeader>
        <EditableDataTable
          ref="editableTableRef"
          :columns="editableColumns"
          :data="quoteItems"
          :show-actions="true"
          :editable="true"
          :show-new-row="showNewRow"
          :new-row-template="newRowTemplate"
          @field-change="handleFieldChange"
          @save="handleSave"
          @new-row-save="handleNewRowSave"
          @new-row-cancel="showNewRow = false"
          @new-row-show="showNewRow = true"
          @row-delete="handleRowDelete"
          @row-edit="handleRowEdit"
        >
          <template #cell-id="{ value }">
            {{ value || '待生成' }}
          </template>

          <template #cell-customerFile="{ value }">
            {{ value || '-' }}
          </template>

          <template #cell-material="{ value }">
            {{ value || '-' }}
          </template>

          <template #cell-thickness="{ value }">
            {{ value || '-' }}
          </template>

          <template #cell-processing="{ value }">
            {{ value || '-' }}
          </template>

          <template #cell-quantity="{ value }">
            {{ value }}
          </template>

          <template #cell-unitPrice="{ value }">
            NT$ {{ Number(value || 0).toLocaleString('zh-TW') }}
          </template>

          <template #cell-subtotal="{ row }">
            <span class="highlight">
              NT$ {{ Number((row.unitPrice || 0) * (row.quantity || 0)).toLocaleString('zh-TW') }}
            </span>
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
            <!-- 非編輯模式：顯示刪除按鈕 -->
            <template v-else>
              <button 
                class="btn btn-sm btn-danger" 
                @click="deleteItem(row.id)"
              >
                刪除
              </button>
            </template>
          </template>
        </EditableDataTable>
      </div>
    </div>

    <!-- 列印視圖（隱藏，僅在列印時顯示） -->
    <div v-if="quote" class="print-view" ref="printViewRef">
      <div class="print-container">
        <!-- 公司資訊 -->
        <div class="print-header">
          <div class="company-info">
            <h1 class="company-name">奕新雷射精機股份有限公司</h1>
            <div class="company-address">台中市東區東光園路310號</div>
            <div class="company-contact">
              <span>TEL:04-22130117</span>
              <span>FAX:04-22130113</span>
            </div>
          </div>
          <div class="document-title">估價單</div>
        </div>

        <!-- 報價單資訊 -->
        <div class="print-quote-info">
          <div class="quote-info-left">
            <div class="info-row">
              <span class="info-label">客戶名稱：</span>
              <span class="info-value">{{ quote.customer?.companyName || quote.customer?.companyShortName || '未指定' }}</span>
            </div>
            <div class="info-row" v-if="quote.customer?.contacts && quote.customer.contacts.length > 0">
              <span class="info-label">ATTENTION:</span>
              <span class="info-value">{{ quote.customer.contacts[0].name || '' }}</span>
            </div>
            <div class="info-row" v-if="quote.customer?.phones && quote.customer.phones.length > 0">
              <span class="info-label">聯絡電話：</span>
              <span class="info-value">{{ quote.customer.phones[0] }}</span>
            </div>
            <div class="info-row" v-if="quote.customer?.fax">
              <span class="info-label">傳真號碼：</span>
              <span class="info-value">{{ quote.customer.fax }}</span>
            </div>
          </div>
          <div class="quote-info-right">
            <div class="info-row">
              <span class="info-label">報價編號：</span>
              <span class="info-value">{{ quote.id }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">日期：</span>
              <span class="info-value">{{ formatRocDate(quote.createdAt) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">經手人：</span>
              <span class="info-value">{{ quote.staff?.name || '未知' }}</span>
            </div>
          </div>
        </div>

        <!-- 表格 -->
        <div class="print-table-container">
          <table class="print-table">
            <thead>
              <tr>
                <th class="col-item">項次</th>
                <th class="col-customer-file">客戶型號</th>
                <th class="col-material">材質</th>
                <th class="col-thickness">厚度</th>
                <th class="col-summary">摘要</th>
                <th class="col-quantity">數量</th>
                <th class="col-unit-price">單價</th>
                <th class="col-amount">金額</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in quoteItems" :key="item.id">
                <td class="col-item">{{ index + 1 }}</td>
                <td class="col-customer-file">{{ item.customerFile || '-' }}</td>
                <td class="col-material">{{ item.material || '-' }}</td>
                <td class="col-thickness">{{ item.thickness || '-' }}</td>
                <td class="col-summary">{{ item.processing || '-' }}</td>
                <td class="col-quantity text-right">{{ formatInteger(item.quantity) }}</td>
                <td class="col-unit-price text-right">{{ formatNumber(item.unitPrice) }}</td>
                <td class="col-amount text-right">{{ formatNumber((item.quantity || 0) * (item.unitPrice || 0)) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="7" class="text-right total-label">合計</td>
                <td class="text-right total-amount">{{ formatNumber(quote.totalAmount) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- 備註 -->
        <div class="print-notes" v-if="quote.notes">
          <div class="notes-title">備註</div>
          <div class="notes-content">{{ quote.notes }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { PageHeader, StatusBadge, TableHeader, EditableDataTable, type EditableColumn, ShortcutHint } from '@/components';
import { quoteService, type Quote } from '@/services/crm/quote.service';
import { quoteItemService, type QuoteItem } from '@/services/crm/quote.service';

const route = useRoute();
const router = useRouter();

const quote = ref<Quote | null>(null);
const quoteItems = ref<QuoteItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// EditableDataTable ref
const editableTableRef = ref<InstanceType<typeof EditableDataTable> | null>(null);

// 表格狀態（用於 ShortcutHint）
const tableState = computed(() => {
  const tableRef = editableTableRef.value;
  if (!tableRef) return null;
  
  return {
    focusedRowIndex: tableRef.focusedRowIndex,
    focusedFieldKey: tableRef.focusedFieldKey,
    isNewRowFocused: tableRef.isNewRowFocused,
    editingRowId: tableRef.editingRowId,
    data: tableRef.data,
  };
});

// 新增行控制
const showNewRow = ref(false);

// 新增行模板
const newRowTemplate = () => {
  if (!quote.value) {
    return {
      customerFile: '',
      material: '',
      thickness: '',
      processing: '',
      quantity: 0,
      unitPrice: 0,
    };
  }
  return {
    quoteId: quote.value.id,
    customerFile: '',
    material: '',
    thickness: '',
    processing: '',
    quantity: 0,
    unitPrice: 0,
  };
};

// 可編輯表格列定義
const editableColumns = computed<EditableColumn[]>(() => [
  { 
    key: 'id', 
    label: '工件編號', 
    editable: false 
  },
  { 
    key: 'customerFile', 
    label: '客戶圖檔', 
    editable: true, 
    type: 'text' 
  },
  { 
    key: 'material', 
    label: '材質', 
    editable: true, 
    type: 'text' 
  },
  { 
    key: 'thickness', 
    label: '厚度', 
    editable: true, 
    type: 'text' 
  },
  { 
    key: 'processing', 
    label: '加工', 
    editable: true, 
    type: 'text' 
  },
  { 
    key: 'quantity', 
    label: '數量', 
    editable: true, 
    required: true, 
    type: 'number' 
  },
  { 
    key: 'unitPrice', 
    label: '單價', 
    editable: true, 
    required: true, 
    type: 'number' 
  },
  { 
    key: 'subtotal', 
    label: '小計', 
    editable: false 
  },
]);

// 載入報價單資料
const loadQuote = async () => {
  const quoteId = route.params.id as string;
  if (!quoteId) {
    error.value = '無效的報價單編號';
    return;
  }

  loading.value = true;
  error.value = null;
  
  try {
    // 載入報價單詳細資料
    quote.value = await quoteService.getById(quoteId);
    quoteItems.value = await quoteItemService.getAll(quoteId);
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入報價單資料失敗';
    console.error('Failed to load quote:', err);
  } finally {
    loading.value = false;
  }
};

// 處理欄位變更（僅更新本地狀態，不自動保存）
const handleFieldChange = (_row: QuoteItem, _field: string, _value: any, _isNew: boolean) => {
  // 只更新本地狀態，不觸發自動保存
  // 保存將在 Enter 或 blur 時觸發
};

// 處理手動保存
const handleSave = async (row: QuoteItem, isNew: boolean) => {
  if (!quote.value) {
    alert('報價單資料不存在');
    return;
  }

  try {
    const data: Partial<QuoteItem> = {
      quoteId: quote.value.id,
      customerFile: row.customerFile || undefined,
      material: row.material || undefined,
      thickness: row.thickness || undefined,
      processing: row.processing || undefined,
      quantity: row.quantity || 0,
      unitPrice: row.unitPrice || 0,
    };

    if (isNew) {
      await quoteItemService.create(data);
    } else {
      await quoteItemService.update(row.id, data);
    }

    await loadQuote();
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存工件失敗');
  }
};

// 處理新增行保存
const handleNewRowSave = async (row: any) => {
  if (!quote.value) {
    alert('報價單資料不存在');
    return;
  }

  try {
    const data: Partial<QuoteItem> = {
      quoteId: quote.value.id,
      customerFile: row.customerFile || undefined,
      material: row.material || undefined,
      thickness: row.thickness || undefined,
      processing: row.processing || undefined,
      quantity: row.quantity || 0,
      unitPrice: row.unitPrice || 0,
    };
    await quoteItemService.create(data);
    showNewRow.value = false;
    await loadQuote();
  } catch (err) {
    alert(err instanceof Error ? err.message : '建立工件失敗');
  }
};

// 刪除工件
const deleteItem = async (id: string) => {
  if (!confirm('確定要刪除此工件嗎？此操作無法復原。')) return;
  
  try {
    await quoteItemService.delete(id);
    await loadQuote();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除工件失敗');
  }
};

// 處理 row-delete 事件（快捷鍵觸發）
const handleRowDelete = async (row: QuoteItem) => {
  if (!confirm('確定要刪除此工件嗎？此操作無法復原。')) return;
  
  try {
    await quoteItemService.delete(row.id);
    await loadQuote();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除工件失敗');
  }
};

// 處理 row-edit 事件（快捷鍵觸發，F2）
const handleRowEdit = (_row: QuoteItem, _index: number) => {
  // 編輯狀態會由 EditableDataTable 內部處理
  // 這裡可以加入額外的邏輯，例如記錄編輯歷史等
};

// 處理快捷鍵點擊
const handleShortcutClick = (action: string) => {
  if (!editableTableRef.value || !tableState.value) return;

  const state = tableState.value;
  const data = state.data();
  const currentRowIndex = state.focusedRowIndex;

  switch (action) {
    case 'arrow-up':
      if (currentRowIndex !== null && currentRowIndex > 0) {
        // 由表格內部處理
        break;
      }
      break;

    case 'arrow-down':
      if (currentRowIndex !== null && currentRowIndex < data.length - 1) {
        // 由表格內部處理
        break;
      }
      break;

    case 'row-edit':
      if (currentRowIndex !== null && data[currentRowIndex]) {
        editableTableRef.value.startEdit(data[currentRowIndex], currentRowIndex);
        handleRowEdit(data[currentRowIndex], currentRowIndex);
      }
      break;

    case 'row-delete':
      if (currentRowIndex !== null && data[currentRowIndex]) {
        handleRowDelete(data[currentRowIndex]);
      }
      break;

    case 'cancel-edit':
      if (currentRowIndex !== null && data[currentRowIndex]) {
        editableTableRef.value.cancelEdit(data[currentRowIndex], currentRowIndex);
      }
      break;

    case 'new-row-show':
      showNewRow.value = true;
      break;

    case 'save-and-next':
    case 'next-field':
    case 'prev-field':
      // 這些操作由表格內部處理
      break;

    case 'cancel-new-row':
      editableTableRef.value.cancelNewRow();
      break;
  }
};

// 返回上一頁
const goBack = () => {
  router.push('/crm/quotes');
};

// 列印視圖 ref
const printViewRef = ref<HTMLElement | null>(null);

// 格式化民國年日期
const formatRocDate = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const rocYear = date.getFullYear() - 1911;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${rocYear}.${month}.${day}`;
};

// 格式化數字（保留兩位小數）
const formatNumber = (num: number) => {
  return Number(num || 0).toFixed(2);
};

// 格式化整數（不帶小數點）
const formatInteger = (num: number) => {
  return Math.round(num || 0).toString();
};

// 處理列印
const handlePrint = () => {
  if (!printViewRef.value) return;
  
  // 創建新窗口用於列印
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('無法開啟列印視窗，請檢查瀏覽器的彈出視窗設定');
    return;
  }

  // 獲取列印視圖的 HTML
  const printContent = printViewRef.value.innerHTML;
  
  // 構建完整的 HTML 文檔
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>報價單 - ${quote.value?.id || ''}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Microsoft JhengHei', '微軟正黑體', Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          color: #000;
          background: white;
        }
        
        .print-container {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 15mm 20mm;
          background: white;
        }
        
        .print-header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .company-info {
          margin-bottom: 10px;
        }
        
        .company-name {
          font-size: 18pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .company-address {
          font-size: 11pt;
          margin-bottom: 5px;
        }
        
        .company-contact {
          font-size: 10pt;
          display: flex;
          justify-content: center;
          gap: 15px;
        }
        
        .document-title {
          font-size: 20pt;
          font-weight: bold;
          margin-top: 10px;
        }
        
        .print-quote-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .quote-info-left,
        .quote-info-right {
          flex: 1;
        }
        
        .info-row {
          margin-bottom: 5px;
        }
        
        .info-label {
          font-weight: 500;
        }
        
        .info-value {
          margin-left: 5px;
        }
        
        .print-table-container {
          margin-bottom: 20px;
        }
        
        .print-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10pt;
        }
        
        .print-table th,
        .print-table td {
          border: 1px solid #000;
          padding: 5px;
          text-align: left;
        }
        
        .print-table th {
          background-color: #f0f0f0;
          font-weight: bold;
          text-align: center;
        }
        
        .print-table td {
          vertical-align: top;
        }
        
        .text-right {
          text-align: right;
        }
        
        .col-item {
          width: 5%;
        }
        
        .col-customer-file {
          width: 15%;
        }
        
        .col-material {
          width: 12%;
        }
        
        .col-thickness {
          width: 8%;
        }
        
        .col-summary {
          width: 15%;
        }
        
        .col-quantity {
          width: 10%;
        }
        
        .col-unit-price {
          width: 12%;
        }
        
        .col-amount {
          width: 13%;
        }
        
        .total-label {
          font-weight: bold;
          text-align: right;
          padding-right: 10px;
        }
        
        .total-amount {
          font-weight: bold;
        }
        
        .print-notes {
          margin-top: 20px;
          font-size: 10pt;
        }
        
        .notes-title {
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .notes-content {
          white-space: pre-line;
          line-height: 1.8;
        }
        
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          
          body {
            margin: 0;
            padding: 0;
          }
          
          .print-container {
            width: 100%;
            min-height: 100vh;
            padding: 15mm 20mm;
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      ${printContent}
    </body>
    </html>
  `;

  // 寫入內容並列印
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // 等待內容載入後列印
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      // 列印後關閉視窗（可選）
      // printWindow.close();
    }, 250);
  };
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
.empty-message {
  padding: 3rem;
  text-align: center;
  color: var(--secondary-500);
  font-size: var(--font-size-base);
}

.highlight {
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

/* 列印視圖樣式（在螢幕上隱藏） */
.print-view {
  display: none;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .details-grid {
    grid-template-columns: 1fr;
  }

  .quote-item-details {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>




