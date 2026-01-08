<template>
  <div class="work-order-items-page">
    <PageHeader
      title="工作單詳情"
      :description="workOrder ? `` : '載入中...'"
    >
      <template #actions>
        <button class="btn btn-outline" @click="goBack">
          <span class="btn-icon">←</span>
          返回
        </button>
      </template>
    </PageHeader>

    <div v-if="loading" class="loading-message">載入中...</div>
    <div v-else-if="error" class="error-message">{{ error }}</div>

    <div v-else-if="workOrder" class="work-order-items-content">
      <!-- 工作單詳細資訊 -->
      <div class="work-order-details-card">
        <TableHeader title="工作單資訊" />
        <div class="details-content">
          <div class="details-section">
            <h4>基本資訊</h4>
            <div class="details-grid">
              <div class="details-item">
                <span class="details-label">工單編號：</span>
                <span class="details-value">{{ workOrder.id }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">業務員：</span>
                <span class="details-value">{{ workOrder.staff?.name || '未知' }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">客戶：</span>
                <span class="details-value">
                  {{ workOrder.customer?.companyName || workOrder.customer?.companyShortName || '未指定' }}
                </span>
              </div>
              <div class="details-item">
                <span class="details-label">狀態：</span>
                <span class="details-value">
                  <StatusBadge
                    :text="workOrder.isCompleted ? '已完成' : '進行中'"
                    :variant="workOrder.isCompleted ? 'success' : 'info'"
                  />
                </span>
              </div>
            </div>
          </div>

          <div class="details-section">
            <h4>訂單資訊</h4>
            <div class="details-grid">
              <div class="details-item">
                <span class="details-label">運送方式：</span>
                <span class="details-value">{{ workOrder.shippingMethod }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">付款方式：</span>
                <span class="details-value">{{ workOrder.paymentMethod }}</span>
              </div>
              <div class="details-item">
                <span class="details-label">金額：</span>
                <span class="details-value highlight">NT$ {{ Number(workOrder.amount).toLocaleString('zh-TW') }}</span>
              </div>
            </div>
          </div>

          <div class="details-section" v-if="workOrder.notes">
            <h4>備註</h4>
            <p>{{ workOrder.notes }}</p>
          </div>

          <div class="details-section">
            <h4>時間資訊</h4>
            <div class="details-grid">
              <div class="details-item">
                <span class="details-label">建立時間：</span>
                <span class="details-value">
                  {{ workOrder.createdAt ? new Date(workOrder.createdAt).toLocaleString('zh-TW') : '未知' }}
                </span>
              </div>
              <div class="details-item" v-if="workOrder.endedAt">
                <span class="details-label">完成時間：</span>
                <span class="details-value">
                  {{ new Date(workOrder.endedAt).toLocaleString('zh-TW') }}
                </span>
              </div>
              <div class="details-item" v-if="workOrder.updatedAt">
                <span class="details-label">更新時間：</span>
                <span class="details-value">
                  {{ new Date(workOrder.updatedAt).toLocaleString('zh-TW') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 工單工件列表 -->
      <div class="work-order-items-card">
        <TableHeader title="工單工件列表" />
        <div v-if="workOrderItems.length === 0" class="empty-message">
          此工作單尚無工件項目
        </div>
        <DataTable
          v-else
          :columns="itemTableColumns"
          :data="workOrderItems"
          :show-actions="false"
        >
          <template #cell-cadFile="{ value }">
            {{ value || '-' }}
          </template>

          <template #cell-customerFile="{ value }">
            {{ value || '-' }}
          </template>

          <template #cell-material="{ value }">
            {{ value || '-' }}
          </template>

          <template #cell-thickness="{ value }">
            {{ value || '-' }}
          </template>

          <template #cell-processing="{ value }">
            {{ value || '-' }}
          </template>

          <template #cell-unit="{ value }">
            {{ value || '-' }}
          </template>

          <template #cell-unitPrice="{ value }">
            NT$ {{ Number(value).toLocaleString('zh-TW') }}
          </template>

          <template #cell-subtotal="{ row }">
            <span class="highlight">
              NT$ {{ Number(row.unitPrice * row.quantity).toLocaleString('zh-TW') }}
            </span>
          </template>

          <template #cell-status="{ value }">
            <StatusBadge :text="value || '-'" variant="secondary" size="sm" />
          </template>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { PageHeader, StatusBadge, TableHeader, DataTable } from '@/components';
import { workOrderService, workOrderItemService, type WorkOrder, type WorkOrderItem } from '@/services/crm/work-order.service';

const route = useRoute();
const router = useRouter();

const workOrder = ref<WorkOrder | null>(null);
const workOrderItems = ref<WorkOrderItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const itemTableColumns = [
  { key: 'id', label: '工件編號' },
  { key: 'cadFile', label: 'CAD 檔案' },
  { key: 'customerFile', label: '客戶檔案' },
  { key: 'material', label: '材料' },
  { key: 'thickness', label: '厚度' },
  { key: 'processing', label: '加工' },
  { key: 'source', label: '來源' },
  { key: 'quantity', label: '數量' },
  { key: 'unit', label: '單位' },
  { key: 'unitPrice', label: '單價' },
  { key: 'subtotal', label: '小計' },
  { key: 'status', label: '狀態' },
];

const loadWorkOrder = async () => {
  const workOrderId = route.params.id as string;
  if (!workOrderId) {
    error.value = '無效的工作單編號';
    return;
  }

  loading.value = true;
  error.value = null;

  try {
    workOrder.value = await workOrderService.getById(workOrderId);

    // 優先使用後端關聯資料；若沒帶則另外查工件列表
    if (Array.isArray(workOrder.value.workOrderItems)) {
      workOrderItems.value = workOrder.value.workOrderItems;
    } else {
      const response = await workOrderItemService.getAll(workOrderId);
      if (response && typeof response === 'object' && 'data' in response) {
        workOrderItems.value = response.data;
      } else {
        workOrderItems.value = response as WorkOrderItem[];
      }
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '載入工作單資料失敗';
    console.error('Failed to load work order:', err);
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push('/crm/orders');
};

onMounted(() => {
  loadWorkOrder();
});
</script>

<style scoped>
.work-order-items-page {
  max-width: 1400px;
  margin: 0 auto;
}

.loading-message,
.error-message {
  padding: 2rem;
  text-align: center;
}

.error-message {
  color: var(--danger-600);
  background: var(--danger-50);
  border-radius: var(--border-radius-lg);
}

.work-order-items-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.work-order-details-card,
.work-order-items-card {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.details-content {
  padding: 2rem;
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

.details-value.highlight {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--primary-600);
}

.details-section p {
  color: var(--secondary-700);
  line-height: 1.6;
  margin: 0;
}

.empty-message {
  padding: 3rem;
  text-align: center;
  color: var(--secondary-500);
  font-size: var(--font-size-base);
}

.highlight {
  font-weight: 600;
  color: var(--primary-600);
}

.btn-icon {
  margin-right: 0.5rem;
}

@media (max-width: 768px) {
  .details-grid {
    grid-template-columns: 1fr;
  }
}
</style>

