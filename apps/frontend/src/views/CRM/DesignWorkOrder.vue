<template>
  <div class="design-work-order-detail">
    <PageHeader
      :title="headerTitle"
      description="檢視與管理此設計工作單；圖組可維護成員或解除（解除將刪除子工作單）。"
    >
      <template #actions>
        <button type="button" class="btn btn-outline" @click="goBack">返回列表</button>
      </template>
    </PageHeader>

    <div v-if="loading" class="state-message">載入中...</div>
    <div v-else-if="error" class="state-message error">{{ error }}</div>
    <div v-else-if="row" class="detail-body">
      <section class="card summary-card">
        <h3 class="section-title">基本資訊</h3>
        <dl class="summary-grid">
          <div><dt>ID</dt><dd>{{ row.id }}</dd></div>
          <div><dt>訂單編號</dt><dd>{{ row.orderId }}</dd></div>
          <div><dt>工件 ID</dt><dd>{{ row.orderItemId }}</dd></div>
          <div><dt>圖號</dt><dd>{{ row.drawingNumber || '—' }}</dd></div>
          <div><dt>設計師</dt><dd>{{ row.assignedStaff?.name || '—' }}</dd></div>
          <div><dt>狀態</dt><dd>{{ getStatusLabel(row.status) }}</dd></div>
          <div><dt>圖組</dt><dd>{{ row.isDrawingGroup ? '是' : '否' }}</dd></div>
        </dl>
        <div v-if="row.drawingNumber?.trim()" class="summary-actions">
          <button type="button" class="btn btn-sm btn-outline" @click="goCncPreview(row.id)">
            CNC 預覽
          </button>
        </div>
      </section>

      <section v-if="!row.isDrawingGroup" class="card">
        <p class="hint">此工作單尚非圖組。轉為圖組後可將其他工作單加入為成員。</p>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!canConvertToGroup"
          @click="handleConvertToGroup"
        >
          轉換為圖組
        </button>
        <p v-if="!canConvertToGroup" class="form-hint">已屬於其他圖組的工作單無法轉為圖組。</p>
      </section>

      <section v-else class="card">
        <h3 class="section-title">圖組成員</h3>
        <p class="hint">僅可加入非圖組、且未隸屬其他圖組的工作單。</p>

        <div class="add-member-row">
          <label class="add-label">加入工作單</label>
          <select v-model="selectedMemberId" class="form-control add-select">
            <option :value="null">請選擇工作單</option>
            <option v-for="opt in memberOptions" :key="opt.id" :value="opt.id">
              #{{ opt.id }} — {{ opt.drawingNumber || '無圖號' }}（{{ opt.orderId }}）
            </option>
          </select>
          <button
            type="button"
            class="btn btn-primary"
            :disabled="selectedMemberId == null"
            @click="handleAddMember"
          >
            加入
          </button>
        </div>

        <div v-if="!row.children?.length" class="empty-members">尚無成員</div>
        <table v-else class="members-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>圖號</th>
              <th>訂單</th>
              <th>狀態</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in row.children" :key="m.id">
              <td>{{ m.id }}</td>
              <td>{{ m.drawingNumber || '—' }}</td>
              <td>{{ m.orderId }}</td>
              <td>
                <StatusBadge
                  :text="getStatusLabel(m.status)"
                  :variant="getStatusVariant(m.status)"
                  size="sm"
                />
              </td>
              <td class="actions-cell">
                <button type="button" class="btn btn-sm btn-outline" @click="goCncPreview(m.id)">
                  CNC
                </button>
                <button type="button" class="btn btn-sm btn-danger" @click="handleRemoveMember(m)">
                  自圖組移除
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="dissolve-row">
          <button type="button" class="btn btn-danger" @click="showDissolveModal = true">
            解除圖組
          </button>
        </div>
      </section>
    </div>

    <Modal
      :show="showDissolveModal"
      title="解除圖組"
      @close="showDissolveModal = false"
    >
      <p>
        確定要解除圖組嗎？<strong>此操作會永久刪除目前圖組底下的所有子設計工作單</strong>，且無法復原。圖組本身（此頁工作單）會保留並改為一般工作單。
      </p>
      <template #footer>
        <button type="button" class="btn btn-outline" @click="showDissolveModal = false">取消</button>
        <button type="button" class="btn btn-danger" @click="confirmDissolve">確認解除</button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { PageHeader, StatusBadge, Modal } from '@/components';
import {
  designWorkOrderService,
  type DesignWorkOrder,
  DesignWorkOrderStatus,
} from '@/services/crm/design-work-order.service';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref<string | null>(null);
const row = ref<DesignWorkOrder | null>(null);
const allOrders = ref<DesignWorkOrder[]>([]);
const selectedMemberId = ref<number | null>(null);
const showDissolveModal = ref(false);

const headerTitle = computed(() => {
  if (!row.value) return '設計工作單';
  return row.value.isDrawingGroup ? `圖組 #${row.value.id}` : `設計工作單 #${row.value.id}`;
});

const canConvertToGroup = computed(() => {
  const r = row.value;
  if (!r) return false;
  return !r.isDrawingGroup && (r.parentDesignWorkOrderId == null || r.parentDesignWorkOrderId === undefined);
});

const memberOptions = computed(() => {
  const r = row.value;
  if (!r || !r.isDrawingGroup) return [];
  const childIds = new Set((r.children ?? []).map((c) => c.id));
  return allOrders.value.filter((o) => {
    if (o.id === r.id) return false;
    if (o.isDrawingGroup) return false;
    if (o.parentDesignWorkOrderId != null) return false;
    if (childIds.has(o.id)) return false;
    return true;
  });
});

const getStatusLabel = (status: DesignWorkOrderStatus) => {
  const labels: Record<string, string> = {
    [DesignWorkOrderStatus.PENDING]: '待處理',
    [DesignWorkOrderStatus.IN_PROGRESS]: '進行中',
    [DesignWorkOrderStatus.COMPLETED]: '已完成',
  };
  return labels[status] || status;
};

const getStatusVariant = (status: DesignWorkOrderStatus) => {
  const variants: Record<string, string> = {
    [DesignWorkOrderStatus.PENDING]: 'secondary',
    [DesignWorkOrderStatus.IN_PROGRESS]: 'warning',
    [DesignWorkOrderStatus.COMPLETED]: 'success',
  };
  return variants[status] || 'secondary';
};

const load = async () => {
  const id = Number(route.params.id);
  if (Number.isNaN(id)) {
    error.value = '無效的工作單 ID';
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = null;
  try {
    const [detail, listRes] = await Promise.all([
      designWorkOrderService.getById(id),
      designWorkOrderService.getAll(1, 100),
    ]);
    row.value = detail;
    const data = listRes && typeof listRes === 'object' && 'data' in listRes ? listRes.data : listRes;
    allOrders.value = Array.isArray(data) ? data : [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : '載入失敗';
    row.value = null;
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  router.push('/crm/design-work-orders');
};

const goCncPreview = (id: number) => {
  router.push(`/crm/design-work-orders/${id}/cnc-preview`);
};

const handleConvertToGroup = async () => {
  const id = row.value?.id;
  if (id == null) return;
  try {
    await designWorkOrderService.convertToGroup(id);
    await load();
  } catch (e) {
    alert(e instanceof Error ? e.message : '轉換失敗');
  }
};

const handleAddMember = async () => {
  const gid = row.value?.id;
  const mid = selectedMemberId.value;
  if (gid == null || mid == null) return;
  try {
    await designWorkOrderService.addMember(gid, mid);
    selectedMemberId.value = null;
    await load();
  } catch (e) {
    alert(e instanceof Error ? e.message : '加入失敗');
  }
};

const handleRemoveMember = async (m: DesignWorkOrder) => {
  const gid = row.value?.id;
  if (gid == null) return;
  if (!confirm(`確定將工作單 #${m.id} 自圖組移除？（不會刪除該工作單）`)) return;
  try {
    await designWorkOrderService.removeMember(gid, m.id);
    await load();
  } catch (e) {
    alert(e instanceof Error ? e.message : '移除失敗');
  }
};

const confirmDissolve = async () => {
  const id = row.value?.id;
  if (id == null) return;
  try {
    await designWorkOrderService.dissolveGroup(id);
    showDissolveModal.value = false;
    await router.push('/crm/design-work-orders');
  } catch (e) {
    alert(e instanceof Error ? e.message : '解除圖組失敗');
  }
};

onMounted(() => {
  load();
});
</script>

<style scoped>
.design-work-order-detail {
  width: 100%;
  margin: 0 auto;
}

.state-message {
  padding: 2rem;
  text-align: center;
}

.state-message.error {
  color: var(--danger-600);
  background: var(--danger-50);
  border-radius: var(--border-radius-lg);
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.card {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  padding: 1.5rem;
}

.section-title {
  margin: 0 0 1rem;
  font-size: 1.1rem;
  color: var(--secondary-800);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin: 0;
}

.summary-grid dt {
  font-size: 0.85rem;
  color: var(--secondary-500);
  margin: 0 0 0.25rem;
}

.summary-grid dd {
  margin: 0;
  font-weight: 500;
}

.summary-actions {
  margin-top: 1rem;
}

.hint {
  color: var(--secondary-600);
  margin: 0 0 1rem;
  line-height: 1.5;
}

.form-hint {
  font-size: 0.85rem;
  color: var(--secondary-500);
  margin-top: 0.5rem;
}

.add-member-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.add-label {
  font-weight: 500;
}

.add-select {
  min-width: 280px;
  flex: 1;
}

.empty-members {
  padding: 1rem;
  color: var(--secondary-500);
  text-align: center;
  background: var(--secondary-50);
  border-radius: var(--border-radius);
}

.members-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

.members-table th,
.members-table td {
  padding: 0.6rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--secondary-200);
}

.members-table th {
  font-weight: 600;
  color: var(--secondary-700);
}

.actions-cell {
  white-space: nowrap;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.dissolve-row {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--secondary-200);
}
</style>
