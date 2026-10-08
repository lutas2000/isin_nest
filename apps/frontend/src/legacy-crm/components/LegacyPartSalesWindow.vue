<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { legacyGet } from '../services/legacyApi';

// 「出貨記錄」 as on Win7 (isin_vb6 docs/legacy-ui-spec.md): 工件建檔's button and F12
// in 訂單／出貨登錄 open a window titled「{電腦圖號}出貨記錄」 with 確定 at the
// top right and one row per sale line, newest first, then a 合計 row under
// 代料 with the totals of 出貨數 and 金額. The lines are the customer's, or the
// order's when opened from 訂單登錄.
const props = defineProps({
  drawingNo: { type: String, required: true },
  customerCode: { type: String, default: '' },
  orderNo: { type: String, default: '' },
});
const emit = defineEmits(['close']);

const rows = ref<Record<string, any>[]>([]);
const loading = ref(true);
const error = ref('');
const okButton = ref<HTMLButtonElement | null>(null);

const plain = (value: unknown) =>
  value == null || value === '' ? '' : String(Number(Number(value).toFixed(4)));
const fixed2 = (value: unknown) =>
  value == null || value === '' ? '' : Number(value).toFixed(2);

const totals = computed(() => ({
  quantity: rows.value.reduce((sum, row) => sum + Number(row.quantity || 0), 0),
  amount: rows.value.reduce((sum, row) => sum + Number(row.line_total || 0), 0),
}));

onMounted(async () => {
  okButton.value?.focus();
  try {
    const params = new URLSearchParams({
      customer: props.customerCode,
      order: props.orderNo,
    });
    const payload = await legacyGet<{ items: Record<string, any>[] }>(
      `/parts/${encodeURIComponent(props.drawingNo)}/sales?${params}`,
    );
    rows.value = payload.items;
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
      class="legacy-selection legacy-part-sales"
      role="dialog"
      aria-modal="true"
      :aria-label="`${drawingNo}出貨記錄`"
    >
      <div class="legacy-dialog-title">
        <span>{{ drawingNo }}出貨記錄</span>
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
              <th>出貨編號</th>
              <th>訂單編號</th>
              <th>材質</th>
              <th>厚度</th>
              <th>代料</th>
              <th class="num">出貨數</th>
              <th class="num">單　價</th>
              <th class="num">金　額</th>
            </tr>
          </thead>
          <tbody v-if="!loading && !error">
            <tr v-for="(row, index) in rows" :key="`${row.sale_no}-${index}`">
              <td class="num">{{ index + 1 }}</td>
              <td>{{ row.sale_date }}</td>
              <td>{{ row.sale_no }}</td>
              <td>{{ row.order_no }}</td>
              <td>{{ row.material }}</td>
              <td>{{ row.thickness }}</td>
              <td>{{ row.outsource }}</td>
              <td class="num">{{ plain(row.quantity) }}</td>
              <td class="num">{{ fixed2(row.unit_price) }}</td>
              <td class="num">{{ plain(row.line_total) }}</td>
            </tr>
            <tr>
              <td class="num">{{ rows.length + 1 }}</td>
              <td />
              <td />
              <td />
              <td />
              <td />
              <td>合計</td>
              <td class="num">{{ plain(totals.quantity) }}</td>
              <td />
              <td class="num">{{ plain(totals.amount) }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="loading" class="legacy-selection-message">資料載入中…</p>
        <p v-else-if="error" class="legacy-selection-message error">
          {{ error }}
        </p>
      </div>
    </section>
  </div>
</template>
