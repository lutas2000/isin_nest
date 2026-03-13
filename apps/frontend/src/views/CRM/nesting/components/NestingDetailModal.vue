<template>
  <Modal
    :show="show"
    :title="`排版詳情 #${nesting?.id || ''}`"
    size="lg"
    @close="$emit('close')"
  >
    <div v-if="nesting" class="nesting-detail">
      <div class="detail-section">
        <h4>基本資訊</h4>
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">排版 ID：</span>
            <span class="detail-value">{{ nesting.id }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">訂貨單編號：</span>
            <span class="detail-value">{{ nesting.orderId }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">材料：</span>
            <span class="detail-value">{{ nesting.material }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">厚度：</span>
            <span class="detail-value">{{ nesting.thickness }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">數量：</span>
            <span class="detail-value">{{ nesting.quantity }} 張</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">X：</span>
            <span class="detail-value">{{ nesting.x ?? '-' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Y：</span>
            <span class="detail-value">{{ nesting.y ?? '-' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">切削長度：</span>
            <span class="detail-value">{{ nesting.cutLength ?? '-' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">劃線長度：</span>
            <span class="detail-value">{{ nesting.lineLength ?? '-' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">加工時間（秒）：</span>
            <span class="detail-value">{{ nesting.processingTime ?? '-' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">使用率 (%)：</span>
            <span class="detail-value">{{ nesting.utilization ?? '-' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">重量：</span>
            <span class="detail-value">{{ nesting.weight ?? '-' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">廢料 (%)：</span>
            <span class="detail-value">{{ nesting.scrap ?? '-' }}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4>排版工件</h4>
        <div v-if="nesting.nestingItems && nesting.nestingItems.length > 0" class="nesting-items-list">
          <div v-for="item in nesting.nestingItems" :key="item.id" class="nesting-item">
            <span class="item-order-item">工件 #{{ item.id }}</span>
            <span class="item-quantity">數量：{{ item.quantity }}</span>
          </div>
        </div>
        <div v-else class="empty-message">尚無排版工件</div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { Modal } from '@/components'
import type { Nesting } from '@/services/crm/nesting.service'

defineProps<{
  show: boolean
  nesting: Nesting | null
}>()

defineEmits<{
  (e: 'close'): void
}>()
</script>

<style scoped>
.nesting-detail {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-section h4 {
  margin: 0 0 1rem 0;
  font-size: var(--font-size-base);
  color: var(--secondary-800);
  font-weight: 600;
  border-bottom: 2px solid var(--secondary-200);
  padding-bottom: 0.5rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
  font-weight: 500;
}

.detail-value {
  font-size: var(--font-size-base);
  color: var(--secondary-900);
}

.nesting-items-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nesting-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem;
  background: var(--secondary-50);
  border-radius: var(--border-radius);
}

.item-order-item {
  font-weight: 500;
}

.item-quantity {
  color: var(--secondary-600);
}

.empty-message {
  padding: 2rem;
  text-align: center;
  color: var(--secondary-500);
}

@media (max-width: 768px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
