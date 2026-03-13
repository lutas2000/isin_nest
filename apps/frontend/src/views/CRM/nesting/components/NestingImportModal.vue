<template>
  <Modal
    :show="show"
    title="匯入排版"
    size="md"
    @close="handleClose"
  >
    <div class="import-form">
      <div class="form-group">
        <label class="form-label">訂單 <span class="required">*</span></label>
        <select v-model="form.orderId" class="form-select" :disabled="ordersLoading">
          <option value="">請選擇訂單</option>
          <option v-for="order in orders" :key="order.id" :value="order.id">
            {{ order.id }} — {{ order.customer?.name || order.customerId }}
          </option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">材料 <span class="required">*</span></label>
        <input v-model="form.material" type="text" class="form-input" placeholder="例如：不鏽鋼" />
      </div>
      <div class="form-group">
        <label class="form-label">厚度 <span class="required">*</span></label>
        <input v-model="form.thickness" type="text" class="form-input" placeholder="例如：3mm" />
      </div>
      <div class="form-group">
        <label class="form-label">DOCX 檔案 <span class="required">*</span></label>
        <input
          ref="fileInputRef"
          type="file"
          accept=".docx"
          class="form-input"
          @change="handleFileSelect"
        />
      </div>
    </div>
    <template #footer>
      <button class="btn btn-outline" @click="handleClose">取消</button>
      <button
        class="btn btn-primary"
        :disabled="!formValid || loading"
        @click="handleSubmit"
      >
        {{ loading ? '匯入中...' : '確認匯入' }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Modal } from '@/components'
import { nestingService } from '@/services/crm/nesting.service'
import { orderService, type Order } from '@/services/crm/order.service'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'imported'): void
}>()

const loading = ref(false)
const ordersLoading = ref(false)
const orders = ref<Order[]>([])
const form = ref({ orderId: '', material: '', thickness: '' })
const importFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const formValid = computed(() =>
  form.value.orderId && form.value.material && form.value.thickness && importFile.value
)

const loadOrders = async () => {
  ordersLoading.value = true
  try {
    const response = await orderService.getAll()
    if (response && typeof response === 'object' && 'data' in response) {
      orders.value = (response as { data: Order[] }).data
    } else {
      orders.value = response as Order[]
    }
  } catch {
    orders.value = []
  } finally {
    ordersLoading.value = false
  }
}

const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  importFile.value = input.files?.[0] ?? null
}

const resetForm = () => {
  form.value = { orderId: '', material: '', thickness: '' }
  importFile.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const handleClose = () => {
  resetForm()
  emit('close')
}

const handleSubmit = async () => {
  if (!importFile.value) return

  const formData = new FormData()
  formData.append('file', importFile.value)
  formData.append('orderId', form.value.orderId)
  formData.append('material', form.value.material)
  formData.append('thickness', form.value.thickness)

  try {
    loading.value = true
    await nestingService.importFromDocx(formData)
    resetForm()
    emit('imported')
    emit('close')
  } catch (err) {
    alert(err instanceof Error ? err.message : '匯入排版失敗')
  } finally {
    loading.value = false
  }
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    resetForm()
    loadOrders()
  }
})
</script>

<style scoped>
.import-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--secondary-700);
}

.form-label .required {
  color: var(--danger-600);
}

.form-select,
.form-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
  background: white;
}

.form-select:focus,
.form-input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 2px var(--primary-100);
}
</style>
