<template>
  <div class="customers-page">
    <PageHeader 
      title="客戶管理"
    >
      <template #actions>
        <button class="btn btn-primary" @click="showCreateModal = true">
          <span class="btn-icon">👥</span>
          新增客戶
        </button>
      </template>
    </PageHeader>

    <!-- 客戶列表 -->
    <div class="customers-content">
      <SearchFilters
        title="客戶列表"
        :show-search="true"
        search-placeholder="搜尋客戶名稱或公司..."
        v-model:search="customerSearch"
      />

      <div v-if="loading" class="loading-message">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <DataTable
        v-else
        :columns="tableColumns"
        :data="customers"
        :show-actions="true"
        :pagination="true"
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      >
        <template #cell-id="{ row, value }">
          <button
            type="button"
            class="link-button"
            @click="viewDetails(row)"
          >
            {{ value }}
          </button>
        </template>

        <template #cell-phones="{ value }">
          {{ value && value.length > 0 ? value[0] : '無' }}
        </template>

        <template #cell-accountReceivable="{ value }">
          NT$ {{ Number(value).toLocaleString('zh-TW') }}
        </template>

        <template #actions="{ row }">
          <button class="btn btn-sm btn-outline" @click="goToCustomerContacts(row)">
            聯絡人
          </button>
          <button class="btn btn-sm btn-primary" @click="editCustomer(row)">編輯</button>
        </template>
      </DataTable>
    </div>

    <!-- 創建/編輯客戶 Modal -->
    <Modal
      :show="showCreateModal"
      :title="editingCustomer ? '編輯客戶' : '新增客戶'"
      @close="closeModal"
    >
      <div class="modal-form">
        <div class="form-row">
          <div class="form-group">
              <label>客戶ID *</label>
              <input 
                type="text" 
                class="form-control" 
                v-model="customerForm.id" 
                :disabled="!!editingCustomer"
                placeholder="例如：CUST001"
              />
            </div>
          <div class="form-group">
              <label>公司名稱 *</label>
              <input 
                type="text" 
                class="form-control" 
                v-model="customerForm.companyName"
                placeholder="請輸入公司名稱"
              />
            </div>
          </div>

        <div class="form-row">
          <div class="form-group">
            <label>公司簡稱</label>
              <input 
                type="text" 
                class="form-control" 
                v-model="customerForm.companyShortName"
                placeholder="請輸入公司簡稱"
              />
            </div>
          <div class="form-group">
              <label>發票抬頭</label>
              <input 
                type="text" 
                class="form-control" 
                v-model="customerForm.invoiceTitle"
                placeholder="請輸入發票抬頭"
              />
            </div>
          </div>

        <div class="form-row">
          <div class="form-group">
            <label>電話（多筆以逗號分隔）</label>
              <input 
                type="text" 
                class="form-control" 
                v-model="customerForm.phonesStr"
                placeholder="例如：02-1234-5678, 0912-345-678"
              />
            </div>
          <div class="form-group">
              <label>統一編號（多筆以逗號分隔）</label>
              <input 
                type="text" 
                class="form-control" 
                v-model="customerForm.taxIdsStr"
                placeholder="例如：12345678"
              />
            </div>
          </div>

        <div class="form-row">
          <div class="form-group">
            <label>Email</label>
              <input 
                type="email" 
                class="form-control" 
                v-model="customerForm.email"
                placeholder="請輸入 Email"
              />
            </div>
          <div class="form-group">
              <label>傳真</label>
              <input 
                type="text" 
                class="form-control" 
                v-model="customerForm.fax"
                placeholder="請輸入傳真號碼"
              />
            </div>
          </div>

        <div class="form-row">
          <div class="form-group">
              <label>郵遞區號</label>
              <input 
                type="text" 
                class="form-control" 
                v-model="customerForm.postalCode"
                placeholder="例如：100"
              />
            </div>
          <div class="form-group">
              <label>通訊地址</label>
              <input 
                type="text" 
                class="form-control" 
                v-model="customerForm.address"
                placeholder="請輸入通訊地址"
              />
            </div>
          </div>

        <div class="form-group">
          <label>送貨地址</label>
            <input 
              type="text" 
              class="form-control" 
              v-model="customerForm.deliveryAddress"
              placeholder="請輸入送貨地址"
            />
          </div>

        <div class="form-row">
          <div class="form-group">
            <label>往來銀行</label>
              <input 
                type="text" 
                class="form-control" 
                v-model="customerForm.bank"
                placeholder="請輸入往來銀行"
              />
            </div>
          <div class="form-group">
              <label>帳戶號碼</label>
              <input 
                type="text" 
                class="form-control" 
                v-model="customerForm.accountNumber"
                placeholder="請輸入帳戶號碼"
              />
            </div>
          </div>

        <div class="form-row">
          <div class="form-group">
            <label>信用額度</label>
              <input 
                type="number" 
                class="form-control" 
                v-model="customerForm.creditLimit"
                placeholder="0"
              />
            </div>
          <div class="form-group">
              <label>帳款</label>
              <input 
                type="number" 
                class="form-control" 
                v-model="customerForm.accountReceivable"
                placeholder="0"
              />
            </div>
          </div>

        <div class="form-group">
          <label>主要產品</label>
            <input 
              type="text" 
              class="form-control" 
              v-model="customerForm.mainProducts"
              placeholder="請輸入主要產品"
            />
          </div>

        <div class="form-group">
          <label>備註</label>
            <textarea 
              class="form-control" 
              v-model="customerForm.notes"
              rows="3"
              placeholder="請輸入備註"
            ></textarea>
          </div>
      </div>
      <template #footer>
        <div class="modal-footer-actions">
          <button class="btn btn-outline" @click="closeModal">取消</button>
          <div class="footer-right">
            <button 
              v-if="editingCustomer && authStore.isAdmin" 
              class="btn btn-danger" 
              @click="handleDeleteFromModal"
            >
              刪除
            </button>
            <button class="btn btn-primary" @click="saveCustomer" :disabled="!isFormValid">
              {{ editingCustomer ? '更新' : '建立' }}
            </button>
          </div>
        </div>
      </template>
    </Modal>

    <!-- 查看詳情 Modal（含聯絡人列表） -->
    <Modal
      v-if="selectedCustomer"
      :show="showDetailsModal"
      :title="`客戶詳情 - ${selectedCustomer.companyName}`"
      @close="showDetailsModal = false"
    >
      <div class="details-content">
        <div class="details-section">
          <h4>基本資訊</h4>
          <div class="details-grid">
            <div class="details-item">
              <span class="details-label">客戶ID：</span>
              <span class="details-value">{{ selectedCustomer.id }}</span>
            </div>
            <div class="details-item">
              <span class="details-label">公司名稱：</span>
              <span class="details-value">{{ selectedCustomer.companyName }}</span>
            </div>
            <div class="details-item" v-if="selectedCustomer.companyShortName">
              <span class="details-label">公司簡稱：</span>
              <span class="details-value">{{ selectedCustomer.companyShortName }}</span>
            </div>
            <div class="details-item" v-if="selectedCustomer.invoiceTitle">
              <span class="details-label">發票抬頭：</span>
              <span class="details-value">{{ selectedCustomer.invoiceTitle }}</span>
            </div>
            <div class="details-item" v-if="selectedCustomer.taxIds && selectedCustomer.taxIds.length > 0">
              <span class="details-label">統一編號：</span>
              <span class="details-value">{{ selectedCustomer.taxIds.join(', ') }}</span>
            </div>
            <div class="details-item" v-if="selectedCustomer.postalCode">
              <span class="details-label">郵遞區號：</span>
              <span class="details-value">{{ selectedCustomer.postalCode }}</span>
            </div>
            <div class="details-item" v-if="selectedCustomer.mainProducts">
              <span class="details-label">主要產品：</span>
              <span class="details-value">{{ selectedCustomer.mainProducts }}</span>
            </div>
          </div>
        </div>

        <div class="details-section">
          <h4>聯絡資訊</h4>
          <div class="details-grid">
              <div class="details-item" v-if="selectedCustomer.phones && selectedCustomer.phones.length > 0">
                <span class="details-label">電話：</span>
                <span class="details-value">{{ selectedCustomer.phones.join(', ') }}</span>
              </div>
              <div class="details-item" v-if="selectedCustomer.email">
                <span class="details-label">Email：</span>
                <span class="details-value">{{ selectedCustomer.email }}</span>
              </div>
              <div class="details-item" v-if="selectedCustomer.fax">
                <span class="details-label">傳真：</span>
                <span class="details-value">{{ selectedCustomer.fax }}</span>
              </div>
              <div class="details-item" v-if="selectedCustomer.address">
                <span class="details-label">通訊地址：</span>
                <span class="details-value">{{ selectedCustomer.address }}</span>
              </div>
              <div class="details-item" v-if="selectedCustomer.deliveryAddress">
                <span class="details-label">送貨地址：</span>
                <span class="details-value">{{ selectedCustomer.deliveryAddress }}</span>
              </div>
            </div>
          </div>

        <div class="details-section">
          <h4>財務資訊</h4>
          <div class="details-grid">
              <div class="details-item">
                <span class="details-label">信用額度：</span>
                <span class="details-value">NT$ {{ Number(selectedCustomer.creditLimit).toLocaleString('zh-TW') }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">帳款：</span>
                <span class="details-value">NT$ {{ Number(selectedCustomer.accountReceivable).toLocaleString('zh-TW') }}</span>
              </div>
              <div class="details-item" v-if="selectedCustomer.bank">
                <span class="details-label">往來銀行：</span>
                <span class="details-value">{{ selectedCustomer.bank }}</span>
              </div>
              <div class="details-item" v-if="selectedCustomer.accountNumber">
                <span class="details-label">帳戶號碼：</span>
                <span class="details-value">{{ selectedCustomer.accountNumber }}</span>
              </div>
            </div>
          </div>

        <div class="details-section" v-if="selectedCustomer.notes">
          <h4>備註</h4>
          <p>{{ selectedCustomer.notes }}</p>
        </div>

      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { PageHeader, DataTable, SearchFilters, Modal } from '@/components';
import { customerService, type Customer, type Contact } from '@/services/crm/customer.service';
import { contactService } from '@/services/crm/contact.service';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

// 客戶資料
const customers = ref<Customer[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const customerSearch = ref('');

// 分頁狀態
const currentPage = ref(1);
const pageSize = ref(50);
const total = ref(0);

// Modal 控制
const showCreateModal = ref(false);
const showDetailsModal = ref(false);
const editingCustomer = ref<Customer | null>(null);
const selectedCustomer = ref<Customer | null>(null);

// 客戶聯絡人資料
const customerContacts = ref<Contact[]>([]);
const contactsLoading = ref(false);
const contactsError = ref<string | null>(null);

// 表單資料
const customerForm = ref({
  id: '',
  companyName: '',
  invoiceTitle: '',
  companyShortName: '',
  phonesStr: '',
  taxIdsStr: '',
  postalCode: '',
  address: '',
  deliveryAddress: '',
  bank: '',
  accountNumber: '',
  creditLimit: 0,
  accountReceivable: 0,
  fax: '',
  email: '',
  mainProducts: '',
  notes: '',
});

// 表格列定義
const tableColumns = [
  { key: 'id', label: '客戶ID' },
  { key: 'companyName', label: '公司名稱' },
  { key: 'companyShortName', label: '公司簡稱' },
  { key: 'phones', label: '電話' },
  { key: 'email', label: 'Email' },
  { key: 'accountReceivable', label: '帳款' },
];

// 表單驗證
const isFormValid = computed(() => {
  return customerForm.value.id && customerForm.value.companyName;
});

// 載入客戶資料
const loadCustomers = async () => {
  loading.value = true;
  error.value = null;
  try {
    const searchTerm = customerSearch.value.trim() || undefined;
    const response = await customerService.getAll(currentPage.value, pageSize.value, searchTerm);
    // 檢查是否為分頁回應
    if (response && typeof response === 'object' && 'data' in response) {
      customers.value = response.data;
      total.value = response.total;
    } else {
      // 向後兼容：如果不是分頁回應，直接使用數組
      customers.value = response as Customer[];
      total.value = customers.value.length;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入客戶失敗';
    console.error('Failed to load customers:', err);
  } finally {
    loading.value = false;
  }
};

// 處理分頁變化
const handlePageChange = (page: number) => {
  currentPage.value = page;
  loadCustomers();
};

const handlePageSizeChange = (newSize: number) => {
  pageSize.value = newSize;
  currentPage.value = 1;
  loadCustomers();
};

// 載入特定客戶的聯絡人
const loadCustomerContacts = async (customerId: string) => {
  contactsLoading.value = true;
  contactsError.value = null;
  try {
    const response = await contactService.getAll(customerId);
    // 處理分頁回應或直接數組
    if (response && typeof response === 'object' && 'data' in response) {
      customerContacts.value = response.data;
    } else {
      customerContacts.value = response as Contact[];
    }
  } catch (err) {
    contactsError.value = err instanceof Error ? err.message : '載入聯絡人失敗';
    console.error('Failed to load customer contacts:', err);
  } finally {
    contactsLoading.value = false;
  }
};

// 查看詳情（包含聯絡人）
const viewDetails = (customer: Customer) => {
  selectedCustomer.value = customer;
  customerContacts.value = [];
  contactsError.value = null;
  contactsLoading.value = true;
  showDetailsModal.value = true;
  loadCustomerContacts(customer.id);
};

// 前往該客戶的聯絡人列表頁
const goToCustomerContacts = (customer: Customer) => {
  router.push({
    name: 'CRMContactsByCustomer',
    params: {
      customerId: customer.id,
    },
  });
};

// 編輯客戶
const editCustomer = (customer: Customer) => {
  editingCustomer.value = customer;
  customerForm.value = {
    id: customer.id,
    companyName: customer.companyName,
    invoiceTitle: customer.invoiceTitle || '',
    companyShortName: customer.companyShortName || '',
    phonesStr: customer.phones?.join(', ') || '',
    taxIdsStr: customer.taxIds?.join(', ') || '',
    postalCode: customer.postalCode || '',
    address: customer.address || '',
    deliveryAddress: customer.deliveryAddress || '',
    bank: customer.bank || '',
    accountNumber: customer.accountNumber || '',
    creditLimit: Number(customer.creditLimit),
    accountReceivable: Number(customer.accountReceivable),
    fax: customer.fax || '',
    email: customer.email || '',
    mainProducts: customer.mainProducts || '',
    notes: customer.notes || '',
  };
  showCreateModal.value = true;
};

// 儲存客戶
const saveCustomer = async () => {
  if (!isFormValid.value) {
    alert('請填寫必填欄位');
    return;
  }

  try {
    const data: Partial<Customer> = {
      id: customerForm.value.id,
      companyName: customerForm.value.companyName,
      invoiceTitle: customerForm.value.invoiceTitle || undefined,
      companyShortName: customerForm.value.companyShortName || undefined,
      phones: customerForm.value.phonesStr 
        ? customerForm.value.phonesStr.split(',').map(p => p.trim()).filter(p => p)
        : undefined,
      taxIds: customerForm.value.taxIdsStr 
        ? customerForm.value.taxIdsStr.split(',').map(t => t.trim()).filter(t => t)
        : undefined,
      postalCode: customerForm.value.postalCode || undefined,
      address: customerForm.value.address || undefined,
      deliveryAddress: customerForm.value.deliveryAddress || undefined,
      bank: customerForm.value.bank || undefined,
      accountNumber: customerForm.value.accountNumber || undefined,
      creditLimit: customerForm.value.creditLimit,
      accountReceivable: customerForm.value.accountReceivable,
      fax: customerForm.value.fax || undefined,
      email: customerForm.value.email || undefined,
      mainProducts: customerForm.value.mainProducts || undefined,
      notes: customerForm.value.notes || undefined,
    };

    if (editingCustomer.value) {
      await customerService.update(editingCustomer.value.id, data);
    } else {
      await customerService.create(data);
    }

    closeModal();
    await loadCustomers();
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存客戶失敗');
  }
};

// 從 Modal 中刪除客戶
const handleDeleteFromModal = async () => {
  if (!editingCustomer.value) return;
  
  if (!confirm('確定要刪除此客戶嗎？此操作無法復原。')) return;
  
  try {
    await customerService.delete(editingCustomer.value.id);
    closeModal();
    await loadCustomers();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除客戶失敗');
  }
};

// 關閉 Modal
const closeModal = () => {
  showCreateModal.value = false;
  editingCustomer.value = null;
  customerForm.value = {
    id: '',
    companyName: '',
    invoiceTitle: '',
    companyShortName: '',
    phonesStr: '',
    taxIdsStr: '',
    postalCode: '',
    address: '',
    deliveryAddress: '',
    bank: '',
    accountNumber: '',
    creditLimit: 0,
    accountReceivable: 0,
    fax: '',
    email: '',
    mainProducts: '',
    notes: '',
  };
};

// 監聽搜尋關鍵字變化，自動重新載入
watch(customerSearch, () => {
  currentPage.value = 1; // 重置到第一頁
  loadCustomers();
});

// 初始化
onMounted(() => {
  loadCustomers();
});
</script>

<style scoped>
.customers-page {
  width: 100%;
  margin: 0 auto;
}

.customers-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.customers-content {
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
  padding: 0;
  margin: 0;
  border: none;
  background: none;
  color: var(--primary-600);
  cursor: pointer;
  font: inherit;
}

.link-button:hover {
  text-decoration: underline;
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

textarea.form-control {
  resize: vertical;
}

/* Modal Footer 樣式 */
.modal-footer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.footer-right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
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

/* 響應式設計 */
@media (max-width: 768px) {
  .customers-overview {
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
  .customers-overview {
    grid-template-columns: 1fr;
  }
}
</style>

