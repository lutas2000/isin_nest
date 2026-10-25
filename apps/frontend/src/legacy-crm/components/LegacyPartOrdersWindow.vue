<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { loadPartOrders, type PartOrderLine } from '../utils/partOrders';

// 「訂單記錄」 (not on Win7; asked for by 業務 2026-10): drawn like 出貨記錄
// (LegacyPartSalesWindow.vue). 工件建檔's button and F9 in 訂單登錄 list the
// order lines of the drawing, or of the same 客戶型號, newest order first, so
// the 材質／厚度／代料／後加工 made last time can be checked.
const props = defineProps({
  drawingNo: { type: String, required: true },
  customerCode: { type: String, default: '' },
  customerModel: { type: String, default: '' },
  excludeOrderNo: { type: String, default: '' },
});
const emit = defineEmits(['close']);

const rows = ref<PartOrderLine[]>([]);
const loading = ref(true);
const error = ref('');
const okButton = ref<HTMLButtonElement | null>(null);

const plain = (value: unknown) =>
  value == null || value === '' ? '' : String(Number(Number(value).toFixed(4)));

onMounted(async () => {
  okButton.value?.focus();
  try {
    rows.value = await loadPartOrders(props.drawingNo, {
      customerCode: props.customerCode,
      customerModel: props.customerModel,
      excludeOrderNo: props.excludeOrderNo,
    });
  } catch (failure) {
    error.value = (failure as Error).message;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="legacy-modal-backdrop">
    <section
      class="legacy-selection legacy-part-orders"
      role="dialog"
      aria-modal="true"
      :aria-label="`${drawingNo}訂單記錄`"
    >
      <div class="legacy-dialog-title">
        <span>{{ drawingNo }}訂單記錄</span>
        <button
          type="button"
          class="legacy-window-close"
          aria-label="關閉"
          @click="emit('close')"
        >
          ×
        </button>
      </div>
      <div class="legacy-part-sales-buttons">
        <button ref="okButton" type="button" @click="emit('close')">
          確定
        </button>
      </div>
      <div class="legacy-selection-grid">
        <table>
          <thead>
            <tr>
              <th class="num">項次</th>
              <th>日期</th>
              <th>訂單編號</th>
              <th>電腦圖號</th>
              <th>客戶型號</th>
              <th class="num">數 量</th>
              <th>單位</th>
              <th>材質</th>
              <th>厚度</th>
              <th>代料</th>
              <th>圖源</th>
              <th>後加工</th>
            </tr>
          </thead>
          <tbody v-if="!loading && !error">
            <tr v-for="(row, index) in rows" :key="`${row.order_no}-${index}`">
              <td class="num">{{ index + 1 }}</td>
              <td>{{ row.order_date }}</td>
              <td>{{ row.order_no }}</td>
              <td>{{ row.drawing_no }}</td>
              <td :title="row.customer_model">{{ row.customer_model }}</td>
              <td class="num">{{ plain(row.quantity) }}</td>
              <td>{{ row.unit }}</td>
              <td>{{ row.material }}</td>
              <td>{{ row.thickness }}</td>
              <td>{{ row.outsource }}</td>
              <td>{{ row.source }}</td>
              <td :title="row.post_process">{{ row.post_process }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="loading" class="legacy-selection-message">資料載入中…</p>
        <p v-else-if="error" class="legacy-selection-message error">
          {{ error }}
        </p>
        <p v-else-if="!rows.length" class="legacy-selection-message">
          沒有訂單記錄
        </p>
      </div>
    </section>
  </div>
</template>
