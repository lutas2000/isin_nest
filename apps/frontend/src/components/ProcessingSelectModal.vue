<template>
  <Modal
    :show="show"
    title="選擇加工項目"
    @close="handleClose"
  >
    <div class="processing-select-modal">
      <!-- 搜尋 -->
      <div class="search-box">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="搜尋加工項目..."
          class="form-control"
        />
      </div>

      <!-- 加工項目列表 -->
      <div class="processing-list">
        <div v-if="loading" class="loading-message">載入中...</div>
        <div v-else-if="filteredProcessings.length === 0" class="empty-message">
          沒有找到加工項目
        </div>
        <div
          v-else
          v-for="processing in filteredProcessings"
          :key="processing.id"
          class="processing-item"
          :class="{ selected: isSelected(processing.id) }"
          @click="toggleSelection(processing)"
        >
          <div class="processing-checkbox">
            <input
              type="checkbox"
              :checked="isSelected(processing.id)"
              @click.stop
              @change="toggleSelection(processing)"
            />
          </div>
          <div class="processing-info">
            <div class="processing-name">{{ processing.name }}</div>
            <div class="processing-vendor">
              <span v-if="processing.vendor" class="vendor-badge outsourced">
                委外：{{ processing.vendor.name }}
              </span>
              <span v-else class="vendor-badge internal">
                內部加工
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 已選擇的項目 -->
      <div v-if="selectedProcessings.length > 0" class="selected-items">
        <div class="selected-title">已選擇（{{ selectedProcessings.length }}）：</div>
        <div class="selected-tags">
          <span
            v-for="processing in selectedProcessings"
            :key="processing.id"
            class="selected-tag"
          >
            {{ processing.name }}
            <button
              type="button"
              class="remove-btn"
              @click="removeSelection(processing.id)"
            >
              ×
            </button>
          </span>
        </div>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" @click="handleClose">取消</button>
      <button
        v-if="selectedProcessings.length > 0"
        class="btn btn-outline"
        @click="handleClear"
      >
        清除
      </button>
      <button class="btn btn-primary" @click="handleConfirm">
        確定（{{ selectedProcessings.length }}）
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import Modal from './Modal.vue'
import { processingService, type Processing } from '../services/crm/processing.service'

const props = defineProps<{
  show: boolean
  modelValue: number[] // 已選擇的 processingIds
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: number[]): void
  (e: 'close'): void
  (e: 'confirm', value: { ids: number[]; processings: Processing[] }): void
}>()

// 狀態
const loading = ref(false)
const allProcessings = ref<Processing[]>([])
const selectedIds = ref<number[]>([])
const searchQuery = ref('')

// 過濾後的加工項目
const filteredProcessings = computed(() => {
  if (!searchQuery.value) {
    return allProcessings.value
  }
  const query = searchQuery.value.toLowerCase()
  return allProcessings.value.filter(p =>
    p.name.toLowerCase().includes(query) ||
    (p.vendor?.name || '').toLowerCase().includes(query)
  )
})

// 已選擇的加工項目詳情
const selectedProcessings = computed(() => {
  return allProcessings.value.filter(p => selectedIds.value.includes(p.id))
})

// 檢查是否已選擇
const isSelected = (id: number) => {
  return selectedIds.value.includes(id)
}

// 切換選擇
const toggleSelection = (processing: Processing) => {
  const index = selectedIds.value.indexOf(processing.id)
  if (index === -1) {
    selectedIds.value.push(processing.id)
  } else {
    selectedIds.value.splice(index, 1)
  }
}

// 移除選擇
const removeSelection = (id: number) => {
  const index = selectedIds.value.indexOf(id)
  if (index !== -1) {
    selectedIds.value.splice(index, 1)
  }
}

// 載入加工項目
const loadProcessings = async () => {
  loading.value = true
  try {
    const data = await processingService.getAllActive()
    allProcessings.value = data
  } catch (err: any) {
    console.error('載入加工項目失敗:', err)
  } finally {
    loading.value = false
  }
}

// 關閉 Modal
const handleClose = () => {
  emit('close')
}

// 清除所有已選
const handleClear = () => {
  selectedIds.value = []
}

// 確認選擇
const handleConfirm = () => {
  emit('update:modelValue', [...selectedIds.value])
  emit('confirm', {
    ids: [...selectedIds.value],
    processings: [...selectedProcessings.value],
  })
  emit('close')
}

// 監聽 show 變化，重新載入資料
watch(() => props.show, (newShow) => {
  if (newShow) {
    loadProcessings()
    // 初始化已選擇的項目
    selectedIds.value = [...(props.modelValue || [])]
  }
})

// 監聽 modelValue 變化
watch(() => props.modelValue, (newValue) => {
  if (props.show && newValue) {
    selectedIds.value = [...newValue]
  }
}, { deep: true })

// 初始化
onMounted(() => {
  if (props.show) {
    loadProcessings()
    selectedIds.value = [...(props.modelValue || [])]
  }
})
</script>

<style scoped>
.processing-select-modal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 60vh;
}

.search-box {
  position: sticky;
  top: 0;
  background: white;
  padding-bottom: 0.5rem;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-600);
}

.processing-list {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  max-height: 300px;
}

.loading-message,
.empty-message {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
}

.processing-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background-color 0.2s;
}

.processing-item:last-child {
  border-bottom: none;
}

.processing-item:hover {
  background-color: var(--secondary-50, #f8f9fa);
}

.processing-item.selected {
  background-color: var(--primary-50, #e3f2fd);
}

.processing-checkbox {
  flex-shrink: 0;
}

.processing-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.processing-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.processing-name {
  font-weight: 500;
  color: var(--text-primary);
}

.processing-vendor {
  font-size: 0.85rem;
}

.vendor-badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.vendor-badge.internal {
  background: var(--success-bg, #e8f5e9);
  color: var(--success-color, #388e3c);
}

.vendor-badge.outsourced {
  background: var(--info-bg, #e3f2fd);
  color: var(--info-color, #1976d2);
}

.selected-items {
  background: var(--secondary-50, #f8f9fa);
  padding: 1rem;
  border-radius: 8px;
}

.selected-title {
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.selected-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: var(--primary-600);
  color: white;
  border-radius: 4px;
  font-size: 0.85rem;
}

.remove-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0 0.25rem;
  font-size: 1rem;
  line-height: 1;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.remove-btn:hover {
  opacity: 1;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background-color: var(--primary-600);
  border-color: var(--primary-600);
  color: white;
}

.btn-secondary {
  background-color: var(--secondary-100);
  border-color: var(--secondary-300);
  color: var(--secondary-700);
}
</style>
