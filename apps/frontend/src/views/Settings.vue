<template>
  <div class="settings-page">
    <div class="settings-content">
      <!-- 頁籤導航 -->
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-button"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 銷管設定 -->
      <div v-if="activeTab === 'crm'" class="settings-section">
        <SectionHeader title="銷管設定">
          <template #actions>
            <button class="btn btn-primary" @click="showAddCrmModal = true">
              <span class="mr-2">➕</span>
              新增設定
            </button>
          </template>
        </SectionHeader>


        <!-- 依分類顯示設定 -->
        <div v-for="category in crmCategories" :key="category" class="category-section">
          <h4 class="category-title">{{ getCategoryLabel(category) }}</h4>
          <DraggableList
            :items="getCrmConfigsByCategory(category)"
            @order-change="handleCrmOrderChange($event)"
          >
            <template #item="{ item: config }">
              <div class="item-code">{{ config.code }}</div>
              <div class="item-label">{{ config.label }}</div>
            </template>
            <template #actions="{ item: config }">
              <button
                class="btn btn-sm btn-primary"
                @click="editCrmConfig(config)"
              >
                編輯
              </button>
              <button
                class="btn btn-sm btn-danger"
                @click="deleteCrmConfig(config)"
              >
                刪除
              </button>
            </template>
          </DraggableList>
        </div>
      </div>

      <!-- 權限設定 -->
      <div v-if="activeTab === 'feature'" class="settings-section">
        <SectionHeader title="權限設定">
          <template #actions>
            <button class="btn btn-primary" @click="showAddFeatureModal = true">
              <span class="mr-2">➕</span>
              新增職稱
            </button>
          </template>
        </SectionHeader>


        <EditableDataTable
          :columns="featureTableColumns"
          :data="featureConfigs"
          :show-actions="true"
          :editable="false"
        >
          <template #cell-permissions="{ row }">
            <div class="permissions-list">
              <span
                v-for="perm in row.permissions"
                :key="perm.id"
                class="permission-badge"
                :class="getPermissionClass(perm.permission)"
              >
                {{ perm.feature.name }}: {{ getPermissionLabel(perm.permission) }}
              </span>
              <span v-if="!row.permissions || row.permissions.length === 0" class="text-secondary-400">
                無權限設定
              </span>
            </div>
          </template>

          <template #actions="{ row }">
            <div class="action-buttons">
              <button
                class="btn btn-sm btn-primary"
                @click="editFeatureConfig(row)"
              >
                編輯
              </button>
              <button
                class="btn btn-sm btn-danger"
                @click="deleteFeatureConfig(row)"
              >
                刪除
              </button>
            </div>
          </template>
        </EditableDataTable>
      </div>
    </div>

    <CrmConfigModal
      :show="showAddCrmModal || showEditCrmModal"
      :is-editing="showEditCrmModal"
      :initial-data="crmForm"
      @close="closeCrmModal"
      @save="saveCrmConfig"
    />

    <!-- 新增/編輯權限設定模態框 -->
    <Modal
      :show="showAddFeatureModal || showEditFeatureModal"
      :title="showEditFeatureModal ? '編輯權限設定' : '新增權限設定'"
      @close="closeFeatureModal"
    >
      <form @submit.prevent="saveFeatureConfig">
        <div class="form-group">
          <label class="form-label">職稱 *</label>
          <input
            type="text"
            class="form-control"
            v-model="featureForm.jobTitle"
            required
            placeholder="例如：經理"
          />
        </div>

        <div class="form-group">
          <label class="form-label">描述</label>
          <textarea
            class="form-control"
            v-model="featureForm.description"
            rows="3"
            placeholder="職稱的描述"
          />
        </div>

        <div class="form-group">
          <label class="form-label">權限設定</label>
          <div class="permissions-editor">
            <div
              v-for="(perm, index) in featureForm.permissions"
              :key="index"
              class="permission-row"
            >
              <select class="form-control" v-model="perm.feature" required>
                <option value="">選擇功能</option>
                <option
                  v-for="feature in availableFeatures"
                  :key="feature.name"
                  :value="feature.name"
                >
                  {{ feature.label }} ({{ feature.name }})
                </option>
              </select>
              <select class="form-control" v-model="perm.permission" required>
                <option
                  v-for="permType in availablePermissionTypes"
                  :key="permType.value"
                  :value="permType.value"
                >
                  {{ permType.label }}
                </option>
              </select>
              <button
                type="button"
                class="btn btn-sm btn-danger"
                @click="removePermission(index)"
              >
                移除
              </button>
            </div>
            <button
              type="button"
              class="btn btn-outline"
              @click="addPermission"
            >
              ➕ 新增權限
            </button>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-outline" @click="closeFeatureModal">
            取消
          </button>
          <button type="submit" class="btn btn-primary">儲存</button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { EditableDataTable, CrmConfigModal, Modal, DraggableList, SectionHeader } from '@/components';
import { useErrorStore } from '@/stores/error';
import { apiGet, apiPost, apiRequest } from '@/services/api';
import { API_CONFIG } from '@/config/api';

const errorStore = useErrorStore();

// 頁籤
const tabs = [
  { id: 'crm', label: '銷管設定' },
  { id: 'feature', label: '權限設定' },
];

const activeTab = ref('crm');

// CRM 設定
interface CrmConfig {
  id: number;
  category: string;
  code: string;
  label: string;
  displayOrder: number;
}

const crmConfigs = ref<CrmConfig[]>([]);
const showAddCrmModal = ref(false);
const showEditCrmModal = ref(false);
const editingCrmId = ref<number | null>(null);

const crmForm = ref({
  category: '',
  code: '',
  label: '',
});

const crmCategories = ['shipping_method', 'payment_method', 'source_type', 'processing_type'];

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    shipping_method: '運送方式',
    payment_method: '付款方式',
    source_type: '來源類型',
    processing_type: '加工類型',
  };
  return labels[category] || category;
};

const getCrmConfigsByCategory = (category: string) => {
  return crmConfigs.value
    .filter((config) => config.category === category)
    .sort((a, b) => a.displayOrder - b.displayOrder);
};

// 拖曳相關 - 已移至 DraggableList 組件

// Feature 設定
interface Feature {
  name: string;
  label: string;
  description: string;
  module: string;
  category: string;
}

interface PermissionType {
  value: string;
  label: string;
  description: string;
}

interface FeaturePermission {
  id: number;
  feature: Feature;
  permission: 'read' | 'write' | 'personal';
}

interface FeatureConfig {
  id: number;
  jobTitle: string;
  description?: string;
  permissions?: FeaturePermission[];
}

const featureConfigs = ref<FeatureConfig[]>([]);
const availableFeatures = ref<Feature[]>([]);
const availablePermissionTypes = ref<PermissionType[]>([]);
const showAddFeatureModal = ref(false);
const showEditFeatureModal = ref(false);
const editingFeatureId = ref<number | null>(null);

const featureForm = ref({
  jobTitle: '',
  description: '',
  permissions: [] as Array<{ feature: string; permission: string }>,
});

const featureTableColumns = [
  { key: 'jobTitle', label: '職稱' },
  { key: 'description', label: '描述' },
  { key: 'permissions', label: '權限' },
];

// 載入資料
const loadCrmConfigs = async () => {
  try {
    crmConfigs.value = await apiGet<CrmConfig[]>(API_CONFIG.CRM.CONFIGS_ALL || '/crm/configs/all');
  } catch (error) {
    console.error('載入銷管設定失敗:', error);
    errorStore.showError(error instanceof Error ? error.message : '載入失敗');
    // 確保即使出錯也設置為空數組
    crmConfigs.value = [];
  }
};

const loadFeatureConfigs = async () => {
  try {
    featureConfigs.value = await apiGet<FeatureConfig[]>(
      '/auth/feature-configs'
    );
  } catch (error) {
    console.error('載入權限設定失敗:', error);
    errorStore.showError(error instanceof Error ? error.message : '載入失敗');
  }
};

const loadFeatures = async () => {
  try {
    availableFeatures.value = await apiGet<Feature[]>('/auth/features/list');
  } catch (error) {
    console.error('載入功能列表失敗:', error);
    errorStore.showError(error instanceof Error ? error.message : '載入功能列表失敗');
  }
};

const loadPermissionTypes = async () => {
  try {
    availablePermissionTypes.value = await apiGet<PermissionType[]>('/auth/features/permissions');
  } catch (error) {
    console.error('載入權限類型失敗:', error);
  }
};

// CRM 設定操作
const editCrmConfig = (config: CrmConfig) => {
  editingCrmId.value = config.id;
  crmForm.value = {
    category: config.category,
    code: config.code,
    label: config.label,
  };
  showEditCrmModal.value = true;
};

const deleteCrmConfig = async (config: CrmConfig) => {
  if (!confirm(`確定要刪除「${config.label}」嗎？`)) return;

  try {
    await apiRequest(`/crm/configs/${config.id}`, { method: 'DELETE' });
    await loadCrmConfigs();
  } catch (error) {
    errorStore.showError(error instanceof Error ? error.message : '刪除失敗');
  }
};

const saveCrmConfig = async (formValue: { category: string; code: string; label: string }) => {
  try {
    const categoryConfigs = getCrmConfigsByCategory(formValue.category);
    const maxOrder = categoryConfigs.length > 0
      ? Math.max(...categoryConfigs.map((c) => c.displayOrder))
      : -1;
    
    const formData = {
      ...formValue,
      displayOrder: editingCrmId.value
        ? undefined
        : maxOrder + 1,
    };
    
    if (editingCrmId.value) {
      await apiRequest(`/crm/configs/${editingCrmId.value}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
    } else {
      await apiPost('/crm/configs', formData);
    }
    await loadCrmConfigs();
    closeCrmModal();
  } catch (error) {
    errorStore.showError(error instanceof Error ? error.message : '儲存失敗');
  }
};

const closeCrmModal = () => {
  showAddCrmModal.value = false;
  showEditCrmModal.value = false;
  editingCrmId.value = null;
  crmForm.value = {
    category: '',
    code: '',
    label: '',
  };
};

// 拖曳處理 - 處理順序改變
const handleCrmOrderChange = async (newConfigs: CrmConfig[]) => {
  // 更新 display order
  const updates = newConfigs.map((config, index) => ({
    id: config.id,
    displayOrder: index,
  }));
  
  // 批量更新順序
  try {
    await Promise.all(
      updates.map((update) =>
        apiRequest(`/crm/configs/${update.id}`, {
          method: 'PUT',
          body: JSON.stringify({ displayOrder: update.displayOrder }),
        })
      )
    );
    await loadCrmConfigs();
  } catch (error) {
    errorStore.showError(error instanceof Error ? error.message : '更新順序失敗');
  }
};

// Feature 設定操作
const editFeatureConfig = (config: FeatureConfig) => {
  editingFeatureId.value = config.id;
  featureForm.value = {
    jobTitle: config.jobTitle,
    description: config.description || '',
    permissions: (config.permissions || []).map((p) => ({
      feature: p.feature.name,
      permission: p.permission,
    })),
  };
  showEditFeatureModal.value = true;
};

const deleteFeatureConfig = async (config: FeatureConfig) => {
  if (!confirm(`確定要刪除「${config.jobTitle}」的權限設定嗎？`)) return;

  try {
    await apiRequest(`/auth/feature-configs/${config.id}`, {
      method: 'DELETE',
    });
    await loadFeatureConfigs();
  } catch (error) {
    errorStore.showError(error instanceof Error ? error.message : '刪除失敗');
  }
};

const saveFeatureConfig = async () => {
  try {
    if (editingFeatureId.value) {
      await apiRequest(`/auth/feature-configs/${editingFeatureId.value}`, {
        method: 'PUT',
        body: JSON.stringify(featureForm.value),
      });
    } else {
      await apiPost('/auth/feature-configs', featureForm.value);
    }
    await loadFeatureConfigs();
    closeFeatureModal();
  } catch (error) {
    errorStore.showError(error instanceof Error ? error.message : '儲存失敗');
  }
};

const closeFeatureModal = () => {
  showAddFeatureModal.value = false;
  showEditFeatureModal.value = false;
  editingFeatureId.value = null;
  featureForm.value = {
    jobTitle: '',
    description: '',
    permissions: [],
  };
};

const addPermission = () => {
  const defaultPermission = availablePermissionTypes.value.length > 0 
    ? availablePermissionTypes.value[0].value 
    : 'read';
  featureForm.value.permissions.push({ feature: '', permission: defaultPermission });
};

const removePermission = (index: number) => {
  featureForm.value.permissions.splice(index, 1);
};

const getPermissionClass = (permission: string) => {
  if (permission === 'write') return 'badge-write';
  if (permission === 'personal') return 'badge-personal';
  return 'badge-read';
};

const getPermissionLabel = (permission: string) => {
  const permType = availablePermissionTypes.value.find(p => p.value === permission);
  return permType ? permType.label : permission;
};

// 初始化
onMounted(() => {
  loadCrmConfigs();
  loadFeatureConfigs();
  loadFeatures();
  loadPermissionTypes();
});
</script>

<style scoped>
.settings-page {
  width: 100%;
  margin: 0 auto;
}

.settings-content {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  padding: 2rem;
}

/* 頁籤 */
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid var(--secondary-200);
}

.tab-button {
  background: none;
  border: none;
  padding: 1rem 2rem;
  cursor: pointer;
  color: var(--secondary-600);
  font-weight: 500;
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;
}

.tab-button:hover {
  color: var(--primary-600);
  background-color: var(--primary-50);
}

.tab-button.active {
  color: var(--primary-600);
  border-bottom-color: var(--primary-500);
}

/* 區塊標題 - 已移至 SectionHeader 組件 */

.category-section {
  margin-bottom: 2rem;
}

.category-title {
  margin: 0 0 1rem 0;
  color: var(--secondary-800);
  font-size: var(--font-size-lg);
  font-weight: 600;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--secondary-200);
}

/* 權限顯示 */
.permissions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.permission-badge {
  padding: 0.25rem 0.75rem;
  border-radius: var(--border-radius);
  font-size: var(--font-size-xs);
  font-weight: 500;
}

.badge-read {
  background-color: var(--info-100);
  color: var(--info-700);
}

.badge-write {
  background-color: var(--success-100);
  color: var(--success-700);
}

.badge-personal {
  background-color: var(--warning-100);
  color: var(--warning-700);
}

/* 權限編輯器 */
.permissions-editor {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.permission-row {
  display: grid;
  grid-template-columns: 2fr 1fr auto;
  gap: 0.75rem;
  align-items: center;
}

/* 項目內容樣式 */
.item-code {
  font-weight: 600;
  color: var(--secondary-800);
  min-width: 100px;
}

.item-label {
  color: var(--secondary-700);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .settings-content {
    padding: 1rem;
  }

  .tabs {
    flex-direction: column;
  }

  .tab-button {
    text-align: left;
  }

  /* section-header 響應式設計已移至 SectionHeader 組件 */

  .permission-row {
    grid-template-columns: 1fr;
  }
}
</style>
