<template>
  <div class="w-full">
    <div class="rounded-lg bg-white p-4 shadow md:p-8">
      <div class="mb-6 flex flex-wrap gap-2 border-b-2 border-secondary-200 pb-2">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="rounded-t-md border-b-[3px] px-4 py-2 text-sm font-medium transition md:px-6 md:py-3"
          :class="
            activeTab === tab.id
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-secondary-600 hover:bg-primary-50 hover:text-primary-600'
          "
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="activeTab === 'crm'" class="space-y-4">
        <SectionHeader title="銷管設定">
          <template #actions>
            <button
              type="button"
              class="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
              @click="showAddCrmModal = true"
            >
              <span class="mr-1.5">➕</span>
              新增設定
            </button>
          </template>
        </SectionHeader>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-medium text-secondary-700">種類：</span>
          <button
            v-for="option in crmFilterOptions"
            :key="option.value"
            type="button"
            class="rounded-md border px-3 py-1.5 text-sm transition"
            :class="
              selectedCrmFilter === option.value
                ? 'border-primary-500 bg-primary-50 text-primary-700'
                : 'border-secondary-300 text-secondary-700 hover:border-primary-300 hover:text-primary-600'
            "
            @click="selectedCrmFilter = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <EditableDataTable
          :columns="crmTableColumns"
          :data="filteredAndSortedCrmConfigs"
          :show-actions="true"
          :editable="true"
          @save="handleInlineCrmSave"
        >
          <template #actions="{ row, isEditing, save, cancel, startEdit }">
            <template v-if="isEditing">
              <button type="button" class="btn btn-sm btn-success" @click="save()">
                儲存
              </button>
              <button type="button" class="btn btn-sm btn-outline" @click="cancel()">
                取消
              </button>
            </template>
            <template v-else>
              <button type="button" class="dropdown-item" @click="startEdit()">
                編輯
              </button>
              <button
                type="button"
                class="dropdown-item danger"
                @click="openDeleteCrmModal(row)"
              >
                刪除
              </button>
            </template>
          </template>
        </EditableDataTable>
      </div>

      <div v-if="activeTab === 'feature'" class="space-y-4">
        <SectionHeader title="權限設定">
          <template #actions>
            <button
              type="button"
              class="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
              @click="showAddFeatureModal = true"
            >
              <span class="mr-1.5">➕</span>
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
            <div class="flex flex-wrap gap-2">
              <span
                v-for="perm in row.permissions"
                :key="perm.id"
                class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                :class="getPermissionClass(perm.permission)"
              >
                {{ perm.feature.name }}: {{ getPermissionLabel(perm.permission) }}
              </span>
              <span v-if="!row.permissions || row.permissions.length === 0" class="text-sm text-secondary-400">
                無權限設定
              </span>
            </div>
          </template>

          <template #actions="{ row }">
            <button type="button" class="dropdown-item" @click="editFeatureConfig(row)">
              編輯
            </button>
            <button
              type="button"
              class="dropdown-item danger"
              @click="deleteFeatureConfig(row)"
            >
              刪除
            </button>
          </template>
        </EditableDataTable>
      </div>
    </div>

    <CrmConfigModal
      :show="showAddCrmModal"
      :is-editing="false"
      :initial-data="crmForm"
      @close="closeCrmModal"
      @save="saveCrmConfig"
    />

    <Modal
      :show="showDeleteCrmModal"
      title="刪除銷管設定"
      @close="closeDeleteCrmModal"
    >
      <div class="space-y-4">
        <p class="text-sm text-secondary-700">
          確定要刪除「{{ deletingCrmConfig?.label }}」嗎？此操作無法復原。
        </p>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md border border-secondary-300 px-4 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50"
            @click="closeDeleteCrmModal"
          >
            取消
          </button>
          <button
            type="button"
            class="rounded-md bg-danger-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-danger-700"
            @click="confirmDeleteCrm"
          >
            確認刪除
          </button>
        </div>
      </div>
    </Modal>

    <Modal
      :show="showAddFeatureModal || showEditFeatureModal"
      :title="showEditFeatureModal ? '編輯權限設定' : '新增權限設定'"
      @close="closeFeatureModal"
    >
      <form class="space-y-4" @submit.prevent="saveFeatureConfig">
        <div class="space-y-2">
          <label class="block text-sm font-medium text-secondary-700">職稱 *</label>
          <input
            v-model="featureForm.jobTitle"
            type="text"
            required
            placeholder="例如：經理"
            class="w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-secondary-700">描述</label>
          <textarea
            v-model="featureForm.description"
            rows="3"
            placeholder="職稱的描述"
            class="w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-secondary-700">權限設定</label>
          <div class="space-y-3">
            <div
              v-for="(perm, index) in featureForm.permissions"
              :key="index"
              class="grid gap-3 md:grid-cols-[2fr_1fr_auto]"
            >
              <select
                v-model="perm.feature"
                required
                class="w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              >
                <option value="">選擇功能</option>
                <option
                  v-for="feature in availableFeatures"
                  :key="feature.name"
                  :value="feature.name"
                >
                  {{ feature.label }} ({{ feature.name }})
                </option>
              </select>
              <select
                v-model="perm.permission"
                required
                class="w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              >
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
                class="inline-flex items-center justify-center rounded-md border border-danger-300 px-3 py-2 text-sm font-medium text-danger-600 transition hover:bg-danger-50"
                @click="removePermission(index)"
              >
                移除
              </button>
            </div>

            <button
              type="button"
              class="inline-flex items-center rounded-md border border-secondary-300 px-3 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50"
              @click="addPermission"
            >
              ➕ 新增權限
            </button>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="rounded-md border border-secondary-300 px-4 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50"
            @click="closeFeatureModal"
          >
            取消
          </button>
          <button
            type="submit"
            class="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
          >
            儲存
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { EditableDataTable, CrmConfigModal, Modal, SectionHeader } from '@/components';
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

interface CrmConfigTableRow extends CrmConfig {
  categoryLabel: string;
}

const crmConfigs = ref<CrmConfig[]>([]);
const showAddCrmModal = ref(false);
const showDeleteCrmModal = ref(false);
const deletingCrmConfig = ref<CrmConfig | null>(null);

const crmForm = ref({
  category: '',
  code: '',
  label: '',
});

type CrmFilterType = 'shipping_method' | 'payment_method' | 'source_type';

const crmCategorySortOrder: Record<string, number> = {
  shipping_method: 0,
  payment_method: 1,
  source_type: 2,
};

const selectedCrmFilter = ref<CrmFilterType>('shipping_method');

const crmFilterOptions: Array<{ label: string; value: CrmFilterType }> = [
  { label: '運送方式', value: 'shipping_method' },
  { label: '付款方式', value: 'payment_method' },
  { label: '來源類型', value: 'source_type' },
];

const crmTableColumns = [
  { key: 'code', label: '代碼' },
  { key: 'label', label: '名稱' },
];

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    shipping_method: '運送方式',
    payment_method: '付款方式',
    source_type: '來源類型',
    processing_type: '加工類型',
  };
  return labels[category] || category;
};

const filteredAndSortedCrmConfigs = computed<CrmConfigTableRow[]>(() => {
  return crmConfigs.value
    .filter((config) => config.category === selectedCrmFilter.value)
    .slice()
    .sort((a, b) => {
      const categoryOrderDiff =
        (crmCategorySortOrder[a.category] ?? Number.MAX_SAFE_INTEGER) -
        (crmCategorySortOrder[b.category] ?? Number.MAX_SAFE_INTEGER);
      if (categoryOrderDiff !== 0) {
        return categoryOrderDiff;
      }
      return a.displayOrder - b.displayOrder;
    })
    .map((config) => ({
      ...config,
      categoryLabel: getCategoryLabel(config.category),
    }));
});

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
const handleInlineCrmSave = async (row: CrmConfig) => {
  try {
    await apiRequest(`/crm/configs/${row.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        category: row.category,
        code: row.code,
        label: row.label,
      }),
    });
    await loadCrmConfigs();
  } catch (error) {
    errorStore.showError(error instanceof Error ? error.message : '儲存失敗');
  }
};

const openDeleteCrmModal = (config: CrmConfig) => {
  deletingCrmConfig.value = config;
  showDeleteCrmModal.value = true;
};

const closeDeleteCrmModal = () => {
  showDeleteCrmModal.value = false;
  deletingCrmConfig.value = null;
};

const confirmDeleteCrm = async () => {
  if (!deletingCrmConfig.value) return;
  try {
    await apiRequest(`/crm/configs/${deletingCrmConfig.value.id}`, { method: 'DELETE' });
    await loadCrmConfigs();
    closeDeleteCrmModal();
  } catch (error) {
    errorStore.showError(error instanceof Error ? error.message : '刪除失敗');
  }
};

const saveCrmConfig = async (formValue: { category: string; code: string; label: string }) => {
  try {
    const categoryConfigs = crmConfigs.value.filter((config) => config.category === formValue.category);
    const maxOrder = categoryConfigs.length > 0
      ? Math.max(...categoryConfigs.map((c) => c.displayOrder))
      : -1;
    
    const formData = {
      ...formValue,
      displayOrder: maxOrder + 1,
    };

    await apiPost('/crm/configs', formData);
    await loadCrmConfigs();
    closeCrmModal();
  } catch (error) {
    errorStore.showError(error instanceof Error ? error.message : '儲存失敗');
  }
};

const closeCrmModal = () => {
  showAddCrmModal.value = false;
  crmForm.value = {
    category: '',
    code: '',
    label: '',
  };
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
  if (permission === 'write') return 'bg-success-100 text-success-700';
  if (permission === 'personal') return 'bg-warning-100 text-warning-700';
  return 'bg-info-100 text-info-700';
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
