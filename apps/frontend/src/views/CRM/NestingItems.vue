<template>
  <div class="nesting-items-page" v-if="nesting">
    <PageHeader
      :title="`排版工件 - ${nesting.nestingNumber}`"
      description="查看此排版中的所有工件"
    >
      <template #actions>
        <router-link to="/crm/nestings" class="btn btn-outline">
          返回排版列表
        </router-link>
      </template>
    </PageHeader>

    <div class="summary-card">
      <div class="summary-grid">
        <div class="summary-item">
          <span class="label">排版編號</span>
          <span class="value">{{ nesting.nestingNumber }}</span>
        </div>
        <div class="summary-item">
          <span class="label">訂貨單編號</span>
          <span class="value">{{ nesting.orderId }}</span>
        </div>
        <div class="summary-item">
          <span class="label">材料</span>
          <span class="value">{{ nesting.material }}</span>
        </div>
        <div class="summary-item">
          <span class="label">厚度</span>
          <span class="value">{{ nesting.thickness }}</span>
        </div>
        <div class="summary-item">
          <span class="label">張數</span>
          <span class="value">{{ nesting.quantity }}</span>
        </div>
        <div class="summary-item">
          <span class="label">加工時間（秒）</span>
          <span class="value">{{ nesting.processingTime ?? '-' }}</span>
        </div>
      </div>
    </div>

    <div class="table-card">
      <table class="items-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>X</th>
            <th>Y</th>
            <th>加工時間</th>
            <th>數量</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!nesting.nestingItems || nesting.nestingItems.length === 0">
            <td colspan="5" class="empty-cell">尚無排版工件</td>
          </tr>
          <tr v-for="item in nesting.nestingItems" :key="item.id">
            <td>{{ item.id }}</td>
            <td>{{ item.x ?? '-' }}</td>
            <td>{{ item.y ?? '-' }}</td>
            <td>{{ formatSeconds(item.processingTime) }}</td>
            <td>{{ item.quantity }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <div v-else class="loading-message">
    載入中...
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { PageHeader } from '@/components'
import { nestingService, type Nesting } from '@/services/crm/nesting.service'

const route = useRoute()
const nesting = ref<Nesting | null>(null)

const loadData = async () => {
  const id = route.params.id as string
  nesting.value = await nestingService.getById(id)
}

const formatSeconds = (seconds?: number) => {
  if (!seconds && seconds !== 0) return '-'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (v: number) => v.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.nesting-items-page {
  max-width: 1200px;
  margin: 0 auto;
}

.summary-card {
  margin-top: 1rem;
  margin-bottom: 1rem;
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  padding: 1.5rem;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.summary-item .label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

.summary-item .value {
  font-size: var(--font-size-base);
  color: var(--secondary-900);
}

.table-card {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
}

.items-table th,
.items-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--secondary-200);
}

.items-table th {
  background: var(--secondary-50);
  font-weight: 600;
  color: var(--secondary-800);
}

.empty-cell {
  text-align: center;
  color: var(--secondary-500);
}

.loading-message {
  padding: 2rem;
  text-align: center;
}

@media (max-width: 768px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

