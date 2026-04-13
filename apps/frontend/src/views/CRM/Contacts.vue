<template>
  <div class="contacts-page">
    <!-- 聯絡人列表 -->
    <div class="contacts-content">
      <SearchFilters
        :title="pageTitle"
        :card="false"
        :compact="true"
        :show-search="true"
        :search-placeholder="isCustomerMode ? '搜尋聯絡人姓名...' : '搜尋聯絡人姓名或客戶...'"
        v-model:search="contactSearch"
        @update:filter="handleFilterUpdate"
      >
        <template #controls>
          <button class="btn btn-primary" @click="showCreateModal = true">
            <span class="mr-2">👤</span>
            新增聯絡人
          </button>
        </template>
      </SearchFilters>

      <div v-if="loading" class="loading-message">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <EditableDataTable
        v-else
        :columns="tableColumns"
        :data="contacts"
        :show-actions="true"
        :editable="false"
        :pagination="true"
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      >
        <template #cell-customer="{ row }">
          {{ row.customer?.companyName || '未知' }}
        </template>

        <template #cell-phones="{ value }">
          <span v-if="value && value.length > 0">{{ value[0] }}</span>
          <span v-else class="text-secondary-400">無</span>
        </template>

        <template #cell-email="{ value }">
          <span v-if="value">{{ value }}</span>
          <span v-else class="text-secondary-400">無</span>
        </template>

        <template #actions="{ row }">
          <button class="btn btn-sm btn-outline" @click="viewDetails(row)">查看</button>
          <button class="btn btn-sm btn-primary" @click="editContact(row)">編輯</button>
          <button class="btn btn-sm btn-danger" @click="deleteContact(row.id)">刪除</button>
        </template>
      </EditableDataTable>
    </div>

    <!-- 創建/編輯聯絡人 Modal -->
    <Modal 
      :show="showCreateModal" 
      :title="editingContact ? '編輯聯絡人' : '新增聯絡人'"
      @close="closeModal"
    >
        <div class="modal-form">
          <div class="form-group">
            <label>姓名 *</label>
            <input 
              type="text" 
              class="form-control" 
              v-model="contactForm.name"
              placeholder="請輸入聯絡人姓名"
            />
          </div>

          <div class="form-group">
            <label>客戶 *</label>
            <select 
              class="form-control" 
              v-model="contactForm.customerId"
              :disabled="isCustomerMode && !editingContact"
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
            <span v-if="isCustomerMode && !editingContact" class="form-hint">此聯絡人將歸屬於 {{ currentCustomer?.companyName }}</span>
          </div>

          <div class="form-group">
            <label>電話（多筆以逗號分隔）</label>
            <input 
              type="text" 
              class="form-control" 
              v-model="contactForm.phonesStr"
              placeholder="例如：02-1234-5678, 0912-345-678"
            />
          </div>

          <div class="form-group">
            <label>Email</label>
            <input 
              type="email" 
              class="form-control" 
              v-model="contactForm.email"
              placeholder="請輸入 Email"
            />
          </div>
        </div>
      <template #footer>
        <button class="btn btn-outline" @click="closeModal">取消</button>
        <button 
          class="btn btn-primary" 
          @click="saveContact" 
          :disabled="!isFormValid"
        >
          {{ editingContact ? '更新' : '建立' }}
        </button>
      </template>
    </Modal>

    <!-- 查看詳情 Modal -->
    <Modal 
      v-if="selectedContact"
      :show="showDetailsModal" 
      :title="`聯絡人詳情 - ${selectedContact.name}`"
      @close="showDetailsModal = false"
    >
        <div class="details-content">
          <div class="details-section">
            <h4>基本資訊</h4>
            <div class="details-grid">
              <div class="details-item">
                <span class="details-label">聯絡人ID：</span>
                <span class="details-value">{{ selectedContact.id }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">姓名：</span>
                <span class="details-value">{{ selectedContact.name }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">所屬客戶：</span>
                <span class="details-value">{{ selectedContact.customer?.companyName || '未知' }}</span>
              </div>
            </div>
          </div>

          <div class="details-section">
            <h4>聯絡資訊</h4>
            <div class="details-grid">
              <div class="details-item" v-if="selectedContact.phones && selectedContact.phones.length > 0">
                <span class="details-label">電話：</span>
                <span class="details-value">{{ selectedContact.phones.join(', ') }}</span>
              </div>
              <div class="details-item" v-else>
                <span class="details-label">電話：</span>
                <span class="details-value text-secondary-400">未提供</span>
              </div>
              <div class="details-item" v-if="selectedContact.email">
                <span class="details-label">Email：</span>
                <span class="details-value">{{ selectedContact.email }}</span>
              </div>
              <div class="details-item" v-else>
                <span class="details-label">Email：</span>
                <span class="details-value text-secondary-400">未提供</span>
              </div>
            </div>
          </div>

          <div class="details-section" v-if="selectedContact.createdAt">
            <h4>其他資訊</h4>
            <div class="details-grid">
              <div class="details-item">
                <span class="details-label">建立時間：</span>
                <span class="details-value">{{ new Date(selectedContact.createdAt).toLocaleString('zh-TW') }}</span>
              </div>
              <div class="details-item" v-if="selectedContact.updatedAt">
                <span class="details-label">更新時間：</span>
                <span class="details-value">{{ new Date(selectedContact.updatedAt).toLocaleString('zh-TW') }}</span>
              </div>
            </div>
          </div>
        </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { EditableDataTable, SearchFilters, Modal } from '@/components';
import { contactService } from '@/services/crm/contact.service';
import { customerService, type Customer, type Contact } from '@/services/crm/customer.service';

const route = useRoute();

// 聯絡人資料
const contacts = ref<Contact[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const contactSearch = ref('');
const selectedCustomerFilter = ref('');

// 分頁狀態
const currentPage = ref(1);
const pageSize = ref(50);
const total = ref(0);

// 當前客戶（用於客戶模式）
const currentCustomer = ref<Customer | null>(null);

// 是否為客戶模式（帶有 customerId 參數）
const isCustomerMode = computed(() => !!route.params.customerId);

// 頁面標題
const pageTitle = computed(() => {
  if (isCustomerMode.value && currentCustomer.value) {
    return `${currentCustomer.value.companyName} - 聯絡人`;
  }
  return '聯絡人管理';
});

// 客戶資料（用於下拉選單）
const customers = ref<Customer[]>([]);

// Modal 控制
const showCreateModal = ref(false);
const showDetailsModal = ref(false);
const editingContact = ref<Contact | null>(null);
const selectedContact = ref<Contact | null>(null);

// 表單資料
const contactForm = ref({
  name: '',
  customerId: '',
  phonesStr: '',
  email: '',
});

// 表格列定義
const tableColumns = [
  { key: 'name', label: '姓名' },
  { key: 'customer', label: '所屬客戶' },
  { key: 'phones', label: '電話' },
  { key: 'email', label: 'Email' },
];

// 表單驗證
const isFormValid = computed(() => {
  return contactForm.value.name && contactForm.value.customerId;
});

// 載入聯絡人資料
const loadContacts = async () => {
  loading.value = true;
  error.value = null;
  try {
    const customerId = isCustomerMode.value ? (route.params.customerId as string) : (selectedCustomerFilter.value || undefined);
    const searchTerm = contactSearch.value.trim() || undefined;
    const response = await contactService.getAll(customerId, currentPage.value, pageSize.value, searchTerm);
    // 檢查是否為分頁回應
    if (response && typeof response === 'object' && 'data' in response) {
      contacts.value = response.data;
      total.value = response.total;
    } else {
      // 向後兼容：如果不是分頁回應，直接使用數組
      contacts.value = response as Contact[];
      total.value = contacts.value.length;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入聯絡人失敗';
    console.error('Failed to load contacts:', err);
  } finally {
    loading.value = false;
  }
};

// 處理分頁變化
const handlePageChange = (page: number) => {
  currentPage.value = page;
  loadContacts();
};

const handlePageSizeChange = (newSize: number) => {
  pageSize.value = newSize;
  currentPage.value = 1;
  loadContacts();
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

// 處理篩選器更新
const handleFilterUpdate = (key: string, value: string) => {
  if (key === 'customer') {
    selectedCustomerFilter.value = value;
  }
};

// 查看詳情
const viewDetails = (contact: Contact) => {
  selectedContact.value = contact;
  showDetailsModal.value = true;
};

// 編輯聯絡人
const editContact = (contact: Contact) => {
  editingContact.value = contact;
  contactForm.value = {
    name: contact.name,
    customerId: contact.customerId,
    phonesStr: contact.phones?.join(', ') || '',
    email: contact.email || '',
  };
  showCreateModal.value = true;
};

// 儲存聯絡人
const saveContact = async () => {
  if (!isFormValid.value) {
    alert('請填寫必填欄位');
    return;
  }

  try {
    const data: Partial<Contact> = {
      name: contactForm.value.name,
      customerId: contactForm.value.customerId,
      phones: contactForm.value.phonesStr 
        ? contactForm.value.phonesStr.split(',').map(p => p.trim()).filter(p => p)
        : undefined,
      email: contactForm.value.email || undefined,
    };

    if (editingContact.value) {
      await contactService.update(editingContact.value.id, data);
    } else {
      await contactService.create(data);
    }

    closeModal();
    await loadContacts();
  } catch (err) {
    alert(err instanceof Error ? err.message : '儲存聯絡人失敗');
  }
};

// 刪除聯絡人
const deleteContact = async (id: number) => {
  if (!confirm('確定要刪除此聯絡人嗎？此操作無法復原。')) return;
  
  try {
    await contactService.delete(id);
    await loadContacts();
  } catch (err) {
    alert(err instanceof Error ? err.message : '刪除聯絡人失敗');
  }
};

// 關閉 Modal
const closeModal = () => {
  showCreateModal.value = false;
  editingContact.value = null;
  resetForm();
};

// 重置表單
const resetForm = () => {
  contactForm.value = {
    name: '',
    // 客戶模式下預設選擇當前客戶
    customerId: isCustomerMode.value && route.params.customerId 
      ? route.params.customerId as string 
      : '',
    phonesStr: '',
    email: '',
  };
};

// 載入當前客戶資訊（客戶模式）
const loadCurrentCustomer = async () => {
  if (!isCustomerMode.value || !route.params.customerId) {
    currentCustomer.value = null;
    return;
  }

  try {
    currentCustomer.value = await customerService.getById(route.params.customerId as string);
  } catch (err) {
    console.error('Failed to load current customer:', err);
    currentCustomer.value = null;
  }
};

// 初始化頁面
const initPage = async () => {
  await loadCustomers();
  await loadContacts();
  
  if (isCustomerMode.value) {
    await loadCurrentCustomer();
  }
  
  // 重置表單以套用正確的預設客戶
  resetForm();
};

// 監聽搜尋關鍵字變化，自動重新載入
watch(contactSearch, () => {
  currentPage.value = 1; // 重置到第一頁
  loadContacts();
});

// 監聽客戶篩選器變化，自動重新載入
watch(selectedCustomerFilter, () => {
  currentPage.value = 1; // 重置到第一頁
  loadContacts();
});

// 監聽路由參數變化
watch(
  () => route.params.customerId,
  async (newCustomerId) => {
    if (newCustomerId) {
      await loadCurrentCustomer();
    } else {
      currentCustomer.value = null;
    }
    currentPage.value = 1; // 重置到第一頁
    await loadContacts();
    resetForm();
  }
);

// 初始化
onMounted(() => {
  initPage();
});
</script>

<style scoped>
.contacts-page {
  width: 100%;
  margin: 0 auto;
}

.contacts-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.contacts-content {
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



/* Modal 表單樣式 */
.modal-form {
  max-height: 60vh;
  overflow-y: auto;
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

select.form-control:disabled {
  background-color: var(--secondary-100);
  cursor: not-allowed;
  opacity: 0.7;
}

.form-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: var(--font-size-sm);
  color: var(--secondary-500);
  font-style: italic;
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
  .contacts-overview {
    grid-template-columns: repeat(2, 1fr);
  }

  .details-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .contacts-overview {
    grid-template-columns: 1fr;
  }
}
</style>

