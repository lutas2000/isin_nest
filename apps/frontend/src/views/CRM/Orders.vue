<template>
  <div class="orders-page">
    <PageHeader 
      title="工作單管理"
    >
      <template #actions>
        <button class="btn btn-primary" @click="showCreateModal = true">
          <span class="btn-icon">📋</span>
          新增工作單
        </button>
      </template>
    </PageHeader>

    <!-- 工單統計 -->
    <div class="orders-overview">
      <OverviewCard 
        icon="📋"
        :value="ordersStats.totalOrders"
        label="總工作單數"
        variant="primary"
      />
      
      <OverviewCard 
        icon="⏳"
        :value="ordersStats.pendingOrders"
        label="進行中"
        variant="warning"
      />
    </div>

    <!-- 工單列表 -->
    <div class="orders-content">
      <SearchFilters
        title="工作單列表"
        :show-search="true"
        search-placeholder="搜尋工單編號或客戶..."
        :filters="[
          {
            key: 'status',
            placeholder: '全部狀態',
            options: [
              { value: 'active', label: '進行中' },
              { value: 'completed', label: '已完成' }
            ]
          }
        ]"
        :show-date-filter="false"
        v-model:search="orderSearch"
        @update:filter="handleFilterUpdate"
      />

      <div v-if="loading" class="loading-message">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <DataTable
        v-else
        :columns="tableColumns"
        :data="filteredOrders"
        :show-actions="true"
      >
        <template #cell-customer="{ row }">
          {{ row.customer?.companyName || row.customer?.companyShortName || '未知' }}
        </template>

        <template #cell-staff="{ row }">
          {{ row.staff?.name || '未知' }}
        </template>

        <template #cell-status="{ row }">
          <StatusBadge 
            :text="row.isCompleted ? '已完成' : '進行中'" 
            :variant="row.isCompleted ? 'success' : 'info'"
          />
        </template>
        
        <template #cell-amount="{ value }">
          NT$ {{ Number(value).toLocaleString('zh-TW') }}
        </template>

        <template #cell-createdAt="{ value }">
          {{ value ? new Date(value).toLocaleDateString('zh-TW') : '' }}
        </template>
        
        <template #actions="{ row }">
          <button class="btn btn-sm btn-outline" @click="viewDetails(row)">查看</button>
          <button class="btn btn-sm btn-primary" @click="editOrder(row)">編輯</button>
          <button 
            class="btn btn-sm btn-success" 
            v-if="!row.isCompleted"
            @click="completeOrder(row.id)"
          >
            完成
          </button>
          <button class="btn btn-sm btn-danger" @click="deleteOrder(row.id)">刪除</button>
        </template>
      </DataTable>
    </div>

    <!-- 創建/編輯工單 Modal -->
    <Modal 
      :show="showCreateModal" 
      :title="editingOrder ? '編輯工單' : '新增工單'"
      @close="closeModal"
    >
        <div class="modal-form">
          <div class="form-row">
            <div class="form-group">
              <label>工單ID *</label>
              <input 
                type="text" 
                class="form-control" 
                v-model="orderForm.id" 
                :disabled="!!editingOrder"
                placeholder="例如：WO001"
              />
            </div>
            <div class="form-group">
              <label>業務員 *</label>
              <select 
                class="form-control" 
                v-model="orderForm.staffId"
              >
                <option value="">請選擇業務員</option>
                <option 
                  v-for="staff in staffList" 
                  :key="staff.id" 
                  :value="staff.id"
                >
                  {{ staff.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>客戶 *</label>
              <select 
                class="form-control" 
                v-model="orderForm.customerId"
              >
                <option value="">請選擇客戶</option>
                <option 
                  v-for="customer in customers" 
                  :key="customer.id" 
                  :value="customer.id"
                >
                  {{ customer.companyName }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>金額</label>
              <input 
                type="number" 
                class="form-control" 
                v-model="orderForm.amount"
                placeholder="0"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>運送方式 *</label>
              <select 
                class="form-control" 
                v-model="orderForm.shippingMethod"
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
                v-model="orderForm.paymentMethod"
              >
                <option value="">請選擇付款方式</option>
                <option value="現金">現金</option>
                <option value="轉帳">轉帳</option>
                <option value="月結">月結</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>備註</label>
            <textarea 
              class="form-control" 
              v-model="orderForm.notes"
              rows="3"
              placeholder="請輸入備註"
            ></textarea>
          </div>
        </div>
      <template #footer>
        <button class="btn btn-outline" @click="closeModal">取消</button>
        <button 
          class="btn btn-primary" 
          @click="saveOrder" 
          :disabled="!isFormValid"
        >
          {{ editingOrder ? '更新' : '建立' }}
        </button>
      </template>
    </Modal>

    <!-- 查看詳情 Modal -->
    <Modal 
      :show="showDetailsModal && !!selectedOrder" 
      :title="`工單詳情 ${selectedOrder?.id || ''}`"
      @close="showDetailsModal = false"
    >
        <div class="details-content" v-if="selectedOrder">
          <div class="details-section">
            <h4>基本資訊</h4>
            <div class="details-grid">
              <div class="details-item">
                <span class="details-label">工單編號：</span>
                <span class="details-value">{{ selectedOrder.id }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">業務員：</span>
                <span class="details-value">{{ selectedOrder.staff?.name || '未知' }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">客戶：</span>
                <span class="details-value">
                  {{ selectedOrder.customer?.companyName || selectedOrder.customer?.companyShortName || '未知' }}
                </span>
              </div>
              <div class="details-item">
                <span class="details-label">狀態：</span>
                <span class="details-value">
                  <StatusBadge 
                    :text="selectedOrder.isCompleted ? '已完成' : '進行中'" 
                    :variant="selectedOrder.isCompleted ? 'success' : 'info'"
                  />
                </span>
              </div>
            </div>
          </div>

          <div class="details-section">
            <h4>訂單資訊</h4>
            <div class="details-grid">
              <div class="details-item">
                <span class="details-label">運送方式：</span>
                <span class="details-value">{{ selectedOrder.shippingMethod }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">付款方式：</span>
                <span class="details-value">{{ selectedOrder.paymentMethod }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">金額：</span>
                <span class="details-value">NT$ {{ Number(selectedOrder.amount).toLocaleString('zh-TW') }}</span>
              </div>
            </div>
          </div>

          <div class="details-section" v-if="selectedOrder.notes">
            <h4>備註</h4>
            <p>{{ selectedOrder.notes }}</p>
          </div>

          <div class="details-section">
            <h4>時間資訊</h4>
            <div class="details-grid">
              <div class="details-item">
                <span class="details-label">建立時間：</span>
                <span class="details-value">
                  {{ selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString('zh-TW') : '未知' }}
                </span>
              </div>
              <div class="details-item" v-if="selectedOrder.endedAt">
                <span class="details-label">完成時間：</span>
                <span class="details-value">
                  {{ new Date(selectedOrder.endedAt).toLocaleString('zh-TW') }}
                </span>
              </div>
              <div class="details-item" v-if="selectedOrder.updatedAt">
                <span class="details-label">更新時間：</span>
                <span class="details-value">
                  {{ new Date(selectedOrder.updatedAt).toLocaleString('zh-TW') }}
                </span>
              </div>
            </div>
          </div>

          <div class="details-section" v-if="selectedOrder.workOrderItems && selectedOrder.workOrderItems.length > 0">
            <h4>工單工件</h4>
            <div class="work-order-items-list">
              <div 
                class="work-order-item-card" 
                v-for="item in selectedOrder.workOrderItems" 
                :key="item.id"
              >
                <div class="work-order-item-header">
                  <span class="work-order-item-title">工件 #{{ item.id }}</span>
                  <span class="work-order-item-amount">NT$ {{ Number(item.unitPrice * item.quantity).toLocaleString('zh-TW') }}</span>
                </div>
                <div class="work-order-item-details">
                  <div v-if="item.cadFile">CAD 檔案：{{ item.cadFile }}</div>
                  <div v-if="item.customerFile">客戶檔案：{{ item.customerFile }}</div>
                  <div v-if="item.material">材料：{{ item.material }}</div>
                  <div v-if="item.thickness">厚度：{{ item.thickness }}</div>
                  <div v-if="item.processing">加工：{{ item.processing }}</div>
                  <div>來源：{{ item.source }}</div>
                  <div>數量：{{ item.quantity }} {{ item.unit || '' }}</div>
                  <div>單價：NT$ {{ Number(item.unitPrice).toLocaleString('zh-TW') }}</div>
                  <div v-if="item.estimatedCuttingTime">預估切割時間：{{ item.estimatedCuttingTime }} 分鐘</div>
                  <div>狀態：{{ item.status }}</div>
                  <div v-if="item.drawingStaff">繪圖負責人：{{ item.drawingStaff.name }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { PageHeader, OverviewCard, DataTable, SearchFilters, StatusBadge, Modal } from '@/components';
import { workOrderService, type WorkOrder } from '@/services/crm/work-order.service';
import { customerService, type Customer } from '@/services/crm/customer.service';

// 工單資料
const orders = ref<WorkOrder[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const orderSearch = ref('');
const orderStatusFilter = ref('');

// 客戶和員工資料（用於下拉選單）
const customers = ref<Customer[]>([]);
const staffList = ref<any[]>([]); // 需要從 HR 模組獲取員工資料

// Modal 控制
const showCreateModal = ref(false);
const showDetailsModal = ref(false);
const editingOrder = ref<WorkOrder | null>(null);
const selectedOrder = ref<WorkOrder | null>(null);

// 表單資料
const orderForm = ref({
  id: '',
  staffId: '',
  customerId: '',
  shippingMethod: '',
  paymentMethod: '',
  notes: '',
  amount: 0,
});

// 工單統計
const ordersStats = computed(() => {
  const total = orders.value.length;
  const totalAmount = orders.value.reduce((sum, o) => sum + Number(o.amount), 0);
  const pendingOrders = orders.value.filter(o => !o.isCompleted).length;
  const completedOrders = orders.value.filter(o => o.isCompleted).length;
  
  return {
    totalOrders: total,
    totalAmount: totalAmount.toLocaleString('zh-TW'),
    pendingOrders,
    completedOrders,
  };
});

// 表格列定義
const tableColumns = [
  { key: 'id', label: '工單編號' },
  { key: 'customer', label: '客戶' },
  { key: 'staff', label: '業務員' },
  { key: 'shippingMethod', label: '運送方式' },
  { key: 'paymentMethod', label: '付款方式' },
  { key: 'amount', label: '金額' },
  { key: 'status', label: '狀態' },
  { key: 'createdAt', label: '建立日期' },
];

// 篩選後的工單
const filteredOrders = computed(() => {
  let filtered = orders.value;

  // 文字搜尋
  if (orderSearch.value) {
    const search = orderSearch.value.toLowerCase();
    filtered = filtered.filter(
      (order) =>
        order.id.toLowerCase().includes(search) ||
        order.customer?.companyName?.toLowerCase().includes(search) ||
        order.customer?.companyShortName?.toLowerCase().includes(search),
    );
  }

  // 狀態篩選
  if (orderStatusFilter.value === 'completed') {
    filtered = filtered.filter((order) => order.isCompleted);
  } else if (orderStatusFilter.value === 'active') {
    filtered = filtered.filter((order) => !order.isCompleted);
  }

  return filtered;
});

// 表單驗證
const isFormValid = computed(() => {
  return orderForm.value.id && 
         orderForm.value.staffId && 
         orderForm.value.customerId &&
         orderForm.value.shippingMethod &&
         orderForm.value.paymentMethod;
});

// 處理篩選器更新
const handleFilterUpdate = (key: string, value: string) => {
  if (key === 'status') {
    orderStatusFilter.value = value;
  }
};

// 載入工單資料
const loadOrders = async () => {
  loading.value = true;
  error.value = null;
  try {
    orders.value = await workOrderService.getAll();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入工單失敗';
    console.error('Failed to load work orders:', err);
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
const viewDetails = async (order: WorkOrder) => {
  try {
    // 獲取完整的工單資料（包含關聯的 workOrderItems）
    selectedOrder.value = await workOrderService.getById(order.id);
    showDetailsModal.value = true;
  } catch (err) {
    alert(err instanceof Error ? err.message : '載入工單詳情失敗');
  }
};

// 編輯工單
const editOrder = (order: WorkOrder) => {
  editingOrder.value = order;
  orderForm.value = {
    id: order.id,
    staffId: order.staffId,
    customerId: order.customerId,
    shippingMethod: order.shippingMethod,
    paymentMethod: order.paymentMethod,
    notes: order.notes || '',
    amount: Number(order.amount),
  };
  showCreateModal.value = true;
};

// 儲存工單
const saveOrder = async () => {
  if (!isFormValid.value) {
    alert('請填寫所有必填欄位');
    return;
  }

  try {
    const data: Partial<WorkOrder> = {
      id: orderForm.value.id,
      staffId: orderForm.value.staffId,
      customerId: orderForm.value.customerId,
      shippingMethod: orderForm.value.shippingMethod,
      paymentMethod: orderForm.value.paymentMethod,
      notes: orderForm.value.notes || undefined,
      amount: orderForm.value.amount,
    };

    if (editingOrder.value) {
      await workOrderService.update(editingOrder.value.id, data);
    } else {
      await workOrderService.create(data);
    }

    closeModal();
    await loadOrders();
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存工單失敗');
  }
};

// 完成工單
const completeOrder = async (id: string) => {
  if (!confirm('確定要完成此工單嗎？')) return;
  
  try {
    await workOrderService.complete(id);
    await loadOrders();
  } catch (err) {
    alert(err instanceof Error ? err.message : '完成工單失敗');
  }
};

// 刪除工單
const deleteOrder = async (id: string) => {
  if (!confirm('確定要刪除此工單嗎？此操作無法復原。')) return;
  
  try {
    await workOrderService.delete(id);
    await loadOrders();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除工單失敗');
  }
};

// 關閉 Modal
const closeModal = () => {
  showCreateModal.value = false;
  editingOrder.value = null;
  orderForm.value = {
    id: '',
    staffId: '',
    customerId: '',
    shippingMethod: '',
    paymentMethod: '',
    notes: '',
    amount: 0,
  };
};

// 初始化
onMounted(() => {
  loadCustomers();
  loadStaff();
  loadOrders();
});
</script>

<style scoped>
.orders-page {
  max-width: 1400px;
  margin: 0 auto;
}

.orders-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.orders-content {
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

.form-control:disabled {
  background-color: var(--secondary-100);
  cursor: not-allowed;
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

/* 工單工件列表 */
.work-order-items-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.work-order-item-card {
  background: var(--secondary-50);
  border-radius: var(--border-radius);
  padding: 1rem;
  border: 1px solid var(--secondary-200);
}

.work-order-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.work-order-item-title {
  font-weight: 600;
  color: var(--secondary-900);
}

.work-order-item-amount {
  font-weight: 600;
  color: var(--primary-600);
}

.work-order-item-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: var(--font-size-sm);
  color: var(--secondary-700);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .orders-overview {
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
  .orders-overview {
    grid-template-columns: 1fr;
  }
}
</style>
