<template>
  <div class="settings-page">
    <PageHeader
      title="系統設定"
      description="管理銷管設定和權限設定"
    />

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
        <div class="section-header">
          <h3>銷管設定</h3>
          <button class="btn btn-primary" @click="showAddCrmModal = true">
            <span class="btn-icon">➕</span>
            新增設定
          </button>
        </div>

        <ErrorMessage :message="crmError" type="error" />

        <!-- 依分類顯示設定 -->
        <div v-for="category in crmCategories" :key="category" class="category-section">
          <h4 class="category-title">{{ getCategoryLabel(category) }}</h4>
          <div class="draggable-list">
            <div
              v-for="(config, index) in getCrmConfigsByCategory(category)"
              :key="config.id"
              class="draggable-item"
              :class="{ 'dragging': draggedItem?.config.id === config.id }"
              :draggable="true"
              @dragstart="handleDragStart($event, config, category)"
              @dragover.prevent="handleDragOver($event, index, category)"
              @drop="handleDrop($event, index, category)"
              @dragend="handleDragEnd"
            >
              <div class="drag-handle">☰</div>
              <div class="item-content">
                <div class="item-code">{{ config.code }}</div>
                <div class="item-label">{{ config.label }}</div>
              </div>
              <div class="item-actions">
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
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 權限設定 -->
      <div v-if="activeTab === 'feature'" class="settings-section">
        <div class="section-header">
          <h3>權限設定</h3>
          <button class="btn btn-primary" @click="showAddFeatureModal = true">
            <span class="btn-icon">➕</span>
            新增工作組別
          </button>
        </div>

        <ErrorMessage :message="featureError" type="error" />

        <DataTable
          :columns="featureTableColumns"
          :data="featureConfigs"
          :show-actions="true"
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
              <span v-if="!row.permissions || row.permissions.length === 0" class="text-muted">
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
        </DataTable>
      </div>
    </div>

    <!-- 新增/編輯 CRM 設定模態框 -->
    <Modal
      :show="showAddCrmModal || showEditCrmModal"
      :title="showEditCrmModal ? '編輯銷管設定' : '新增銷管設定'"
      @close="closeCrmModal"
    >
      <form @submit.prevent="saveCrmConfig">
        <div class="form-group">
          <label class="form-label">分類 *</label>
          <select class="form-control" v-model="crmForm.category" required>
            <option value="">選擇分類</option>
            <option value="shipping_method">運送方式</option>
            <option value="payment_method">付款方式</option>
            <option value="source_type">來源類型</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">代碼 *</label>
          <input
            type="text"
            class="form-control"
            v-model="crmForm.code"
            required
            maxlength="50"
            placeholder="例如：EXPRESS"
          />
        </div>

        <div class="form-group">
          <label class="form-label">顯示名稱 *</label>
          <input
            type="text"
            class="form-control"
            v-model="crmForm.label"
            required
            maxlength="100"
            placeholder="例如：快遞"
          />
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-outline" @click="closeCrmModal">
            取消
          </button>
          <button type="submit" class="btn btn-primary">儲存</button>
        </div>
      </form>
    </Modal>

    <!-- 新增/編輯權限設定模態框 -->
    <Modal
      :show="showAddFeatureModal || showEditFeatureModal"
      :title="showEditFeatureModal ? '編輯權限設定' : '新增權限設定'"
      @close="closeFeatureModal"
    >
      <form @submit.prevent="saveFeatureConfig">
        <div class="form-group">
          <label class="form-label">工作組別 *</label>
          <input
            type="text"
            class="form-control"
            v-model="featureForm.workGroup"
            required
            placeholder="例如：A組"
          />
        </div>

        <div class="form-group">
          <label class="form-label">描述</label>
          <textarea
            class="form-control"
            v-model="featureForm.description"
            rows="3"
            placeholder="工作組別的描述"
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
import { ref, computed, onMounted } from 'vue';
import { PageHeader, DataTable, Modal } from '@/components';
import ErrorMessage from '@/components/ErrorMessage.vue';
import { apiGet, apiPost, apiRequest } from '@/services/api';
import { API_CONFIG } from '@/config/api';

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
const crmError = ref('');
const showAddCrmModal = ref(false);
const showEditCrmModal = ref(false);
const editingCrmId = ref<number | null>(null);

const crmForm = ref({
  category: '',
  code: '',
  label: '',
});

const crmCategories = ['shipping_method', 'payment_method', 'source_type'];

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    shipping_method: '運送方式',
    payment_method: '付款方式',
    source_type: '來源類型',
  };
  return labels[category] || category;
};

const getCrmConfigsByCategory = (category: string) => {
  return crmConfigs.value
    .filter((config) => config.category === category)
    .sort((a, b) => a.displayOrder - b.displayOrder);
};

// 拖曳相關
const draggedItem = ref<{ config: CrmConfig; category: string } | null>(null);
const draggedOverIndex = ref<number | null>(null);

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
  workGroup: string;
  description?: string;
  permissions?: FeaturePermission[];
}

const featureConfigs = ref<FeatureConfig[]>([]);
const availableFeatures = ref<Feature[]>([]);
const availablePermissionTypes = ref<PermissionType[]>([]);
const featureError = ref('');
const showAddFeatureModal = ref(false);
const showEditFeatureModal = ref(false);
const editingFeatureId = ref<number | null>(null);

const featureForm = ref({
  workGroup: '',
  description: '',
  permissions: [] as Array<{ feature: string; permission: string }>,
});

const featureTableColumns = [
  { key: 'workGroup', label: '工作組別' },
  { key: 'description', label: '描述' },
  { key: 'permissions', label: '權限' },
];

// 載入資料
const loadCrmConfigs = async () => {
  try {
    crmConfigs.value = await apiGet<CrmConfig[]>(API_CONFIG.CRM.CONFIGS || '/crm/configs');
  } catch (error) {
    console.error('載入銷管設定失敗:', error);
    crmError.value = error instanceof Error ? error.message : '載入失敗';
  }
};

const loadFeatureConfigs = async () => {
  try {
    featureConfigs.value = await apiGet<FeatureConfig[]>(
      '/auth/feature-configs'
    );
  } catch (error) {
    console.error('載入權限設定失敗:', error);
    featureError.value = error instanceof Error ? error.message : '載入失敗';
  }
};

const loadFeatures = async () => {
  try {
    availableFeatures.value = await apiGet<Feature[]>('/auth/features/list');
  } catch (error) {
    console.error('載入功能列表失敗:', error);
    featureError.value = error instanceof Error ? error.message : '載入功能列表失敗';
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
    crmError.value = error instanceof Error ? error.message : '刪除失敗';
  }
};

const saveCrmConfig = async () => {
  try {
    const categoryConfigs = getCrmConfigsByCategory(crmForm.value.category);
    const maxOrder = categoryConfigs.length > 0
      ? Math.max(...categoryConfigs.map((c) => c.displayOrder))
      : -1;
    
    const formData = {
      ...crmForm.value,
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
    crmError.value = error instanceof Error ? error.message : '儲存失敗';
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

// 拖曳處理
const handleDragStart = (event: DragEvent, config: CrmConfig, category: string) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', '');
  }
  draggedItem.value = { config, category };
  if (event.target) {
    (event.target as HTMLElement).style.opacity = '0.5';
  }
};

const handleDragOver = (event: DragEvent, index: number, category: string) => {
  if (!draggedItem.value || draggedItem.value.category !== category) return;
  
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  draggedOverIndex.value = index;
};

const handleDrop = async (event: DragEvent, dropIndex: number, category: string) => {
  event.preventDefault();
  
  if (!draggedItem.value || draggedItem.value.category !== category) return;
  
  const configs = getCrmConfigsByCategory(category);
  const draggedIndex = configs.findIndex(
    (c) => c.id === draggedItem.value!.config.id
  );
  
  if (draggedIndex === -1 || draggedIndex === dropIndex) {
    handleDragEnd();
    return;
  }
  
  // 重新排序
  const newConfigs = [...configs];
  const [removed] = newConfigs.splice(draggedIndex, 1);
  newConfigs.splice(dropIndex, 0, removed);
  
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
    crmError.value = error instanceof Error ? error.message : '更新順序失敗';
  }
  
  handleDragEnd();
};

const handleDragEnd = () => {
  draggedItem.value = null;
  draggedOverIndex.value = null;
  // 恢復所有項目的透明度
  document.querySelectorAll('.draggable-item').forEach((item) => {
    (item as HTMLElement).style.opacity = '1';
  });
};

// Feature 設定操作
const editFeatureConfig = (config: FeatureConfig) => {
  editingFeatureId.value = config.id;
  featureForm.value = {
    workGroup: config.workGroup,
    description: config.description || '',
    permissions: (config.permissions || []).map((p) => ({
      feature: p.feature.name,
      permission: p.permission,
    })),
  };
  showEditFeatureModal.value = true;
};

const deleteFeatureConfig = async (config: FeatureConfig) => {
  if (!confirm(`確定要刪除「${config.workGroup}」的權限設定嗎？`)) return;

  try {
    await apiRequest(`/auth/feature-configs/${config.id}`, {
      method: 'DELETE',
    });
    await loadFeatureConfigs();
  } catch (error) {
    featureError.value = error instanceof Error ? error.message : '刪除失敗';
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
    featureError.value = error instanceof Error ? error.message : '儲存失敗';
  }
};

const closeFeatureModal = () => {
  showAddFeatureModal.value = false;
  showEditFeatureModal.value = false;
  editingFeatureId.value = null;
  featureForm.value = {
    workGroup: '',
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
  max-width: 1400px;
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

/* 區塊標題 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h3 {
  margin: 0;
  color: var(--secondary-900);
}

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

/* 表單 */
.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-weight: 500;
  color: var(--secondary-700);
  margin-bottom: 0.5rem;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px var(--primary-100);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--secondary-200);
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.text-muted {
  color: var(--secondary-500);
  font-style: italic;
}

.btn-icon {
  margin-right: 0.5rem;
}

/* 拖曳列表 */
.draggable-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.draggable-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 1px solid var(--secondary-200);
  border-radius: var(--border-radius);
  cursor: move;
  transition: all 0.2s ease;
}

.draggable-item:hover {
  border-color: var(--primary-300);
  box-shadow: var(--shadow);
}

.draggable-item.dragging {
  opacity: 0.5;
  background-color: var(--primary-50);
}

.drag-handle {
  color: var(--secondary-400);
  font-size: 1.25rem;
  cursor: grab;
  user-select: none;
  padding: 0.25rem;
}

.drag-handle:active {
  cursor: grabbing;
}

.item-content {
  flex: 1;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.item-code {
  font-weight: 600;
  color: var(--secondary-800);
  min-width: 100px;
}

.item-label {
  color: var(--secondary-700);
}

.item-actions {
  display: flex;
  gap: 0.5rem;
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

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .permission-row {
    grid-template-columns: 1fr;
  }
}
</style>
