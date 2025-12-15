<template>
  <div class="contacts-page">
    <PageHeader 
      title="聯絡人管理" 
      description="管理所有客戶的聯絡人資訊"
    >
      <template #actions>
        <button class="btn btn-primary" @click="showCreateModal = true">
          <span class="btn-icon">👤</span>
          新增聯絡人
        </button>
      </template>
    </PageHeader>

    <!-- 聯絡人統計 -->
    <div class="contacts-overview">
      <OverviewCard
        icon="👤"
        :value="contactsStats.totalContacts"
        label="總聯絡人數"
        variant="primary"
      />
      <OverviewCard
        icon="👥"
        :value="contactsStats.totalCustomers"
        label="關聯客戶數"
        variant="info"
      />
      <OverviewCard
        icon="📧"
        :value="contactsStats.withEmail"
        label="有Email"
        variant="success"
      />
      <OverviewCard
        icon="📞"
        :value="contactsStats.withPhone"
        label="有電話"
        variant="warning"
      />
    </div>

    <!-- 聯絡人列表 -->
    <div class="contacts-content">
      <SearchFilters
        title="聯絡人列表"
        :show-search="true"
        search-placeholder="搜尋聯絡人姓名或客戶..."
        :filters="[
          {
            key: 'customer',
            placeholder: '全部客戶',
            options: customerOptions
          }
        ]"
        v-model:search="contactSearch"
        @update:filter="handleFilterUpdate"
      />

      <div v-if="loading" class="loading-message">載入中...</div>
      <div v-else-if="error" class="error-message">{{ error }}</div>
      <DataTable
        v-else
        :columns="tableColumns"
        :data="filteredContacts"
        :show-actions="true"
      >
        <template #cell-customer="{ row }">
          {{ row.customer?.companyName || '未知' }}
        </template>

        <template #cell-phones="{ value }">
          <span v-if="value && value.length > 0">{{ value[0] }}</span>
          <span v-else class="text-muted">無</span>
        </template>

        <template #cell-email="{ value }">
          <span v-if="value">{{ value }}</span>
          <span v-else class="text-muted">無</span>
        </template>

        <template #actions="{ row }">
          <button class="btn btn-sm btn-outline" @click="viewDetails(row)">查看</button>
          <button class="btn btn-sm btn-primary" @click="editContact(row)">編輯</button>
          <button class="btn btn-sm btn-danger" @click="deleteContact(row.id)">刪除</button>
        </template>
      </DataTable>
    </div>

    <!-- 創建/編輯聯絡人 Modal -->
    <Modal v-if="showCreateModal" @close="closeModal">
      <template #title>{{ editingContact ? '編輯聯絡人' : '新增聯絡人' }}</template>
      <template #body>
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
      </template>
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
    <Modal v-if="showDetailsModal && selectedContact" @close="showDetailsModal = false">
      <template #title>聯絡人詳情 - {{ selectedContact.name }}</template>
      <template #body>
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
                <span class="details-value text-muted">未提供</span>
              </div>
              <div class="details-item" v-if="selectedContact.email">
                <span class="details-label">Email：</span>
                <span class="details-value">{{ selectedContact.email }}</span>
              </div>
              <div class="details-item" v-else>
                <span class="details-label">Email：</span>
                <span class="details-value text-muted">未提供</span>
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
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { PageHeader, OverviewCard, DataTable, SearchFilters, Modal } from '@/components';
import { contactService, type Contact } from '@/services/crm/contact.service';
import { customerService, type Customer } from '@/services/crm/customer.service';

const route = useRoute();

// 聯絡人資料
const contacts = ref<Contact[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const contactSearch = ref('');
const selectedCustomerFilter = ref('');

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

// 聯絡人統計
const contactsStats = computed(() => {
  const total = contacts.value.length;
  const uniqueCustomers = new Set(contacts.value.map(c => c.customerId)).size;
  const withEmail = contacts.value.filter(c => c.email).length;
  const withPhone = contacts.value.filter(c => c.phones && c.phones.length > 0).length;
  
  return {
    totalContacts: total,
    totalCustomers: uniqueCustomers,
    withEmail,
    withPhone,
  };
});

// 客戶選項（用於篩選器）
const customerOptions = computed(() => {
  return customers.value.map(c => ({
    value: c.id,
    label: c.companyName,
  }));
});

// 表格列定義
const tableColumns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: '姓名' },
  { key: 'customer', label: '所屬客戶' },
  { key: 'phones', label: '電話' },
  { key: 'email', label: 'Email' },
];

// 篩選後的聯絡人
const filteredContacts = computed(() => {
  let filtered = contacts.value;

  // 文字搜尋
  if (contactSearch.value) {
    const search = contactSearch.value.toLowerCase();
    filtered = filtered.filter(
      (contact) =>
        contact.name.toLowerCase().includes(search) ||
        contact.customer?.companyName.toLowerCase().includes(search),
    );
  }

  // 客戶篩選
  if (selectedCustomerFilter.value) {
    filtered = filtered.filter(
      (contact) => contact.customerId === selectedCustomerFilter.value
    );
  }

  return filtered;
});

// 表單驗證
const isFormValid = computed(() => {
  return contactForm.value.name && contactForm.value.customerId;
});

// 載入聯絡人資料
const loadContacts = async () => {
  loading.value = true;
  error.value = null;
  try {
    contacts.value = await contactService.getAll();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入聯絡人失敗';
    console.error('Failed to load contacts:', err);
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
  contactForm.value = {
    name: '',
    customerId: '',
    phonesStr: '',
    email: '',
  };
};

// 初始化
onMounted(() => {
  loadCustomers();
  loadContacts();

  // 若從客戶頁帶 query 過來，預設套用該客戶篩選
  const initialCustomerId = route.query.customerId as string | undefined;
  if (initialCustomerId) {
    selectedCustomerFilter.value = initialCustomerId;
  }
});
</script>

<style scoped>
.contacts-page {
  max-width: 1400px;
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

.text-muted {
  color: var(--secondary-500);
  font-style: italic;
}

.btn-icon {
  margin-right: 0.5rem;
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

