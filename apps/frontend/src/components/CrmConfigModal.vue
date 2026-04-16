<template>
  <Modal
    :show="show"
    :title="isEditing ? '編輯銷管設定' : '新增銷管設定'"
    @close="handleClose"
  >
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label class="form-label">分類 *</label>
        <select v-model="form.category" class="form-control" required>
          <option value="">選擇分類</option>
          <option
            v-for="category in crmCategories"
            :key="category.value"
            :value="category.value"
          >
            {{ category.label }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">代碼 *</label>
        <input
          v-model="form.code"
          type="text"
          class="form-control"
          required
          maxlength="50"
          placeholder="例如：EXPRESS"
        />
      </div>

      <div class="form-group">
        <label class="form-label">顯示名稱 *</label>
        <input
          v-model="form.label"
          type="text"
          class="form-control"
          required
          maxlength="100"
          placeholder="例如：快遞"
        />
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-outline" @click="handleClose">
          取消
        </button>
        <button type="submit" class="btn btn-primary">儲存</button>
      </div>
    </form>
  </Modal>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import Modal from './Modal.vue';

interface CrmConfigFormData {
  category: string;
  code: string;
  label: string;
}

const emptyForm = (): CrmConfigFormData => ({
  category: '',
  code: '',
  label: '',
});

const props = withDefaults(defineProps<{
  show: boolean;
  isEditing?: boolean;
  initialData?: Partial<CrmConfigFormData> | null;
}>(), {
  isEditing: false,
  initialData: null,
});

const emit = defineEmits<{
  close: [];
  save: [value: CrmConfigFormData];
}>();

const crmCategories = [
  { value: 'shipping_method', label: '運送方式' },
  { value: 'payment_method', label: '付款方式' },
  { value: 'source_type', label: '來源類型' },
  { value: 'processing_type', label: '加工類型' },
];

const form = reactive<CrmConfigFormData>(emptyForm());

const syncForm = () => {
  Object.assign(form, emptyForm(), props.initialData ?? {});
};

watch(
  () => [props.show, props.initialData] as const,
  ([show]) => {
    if (show) {
      syncForm();
    }
  },
  { immediate: true }
);

const handleClose = () => {
  emit('close');
};

const handleSubmit = () => {
  emit('save', { ...form });
};
</script>
