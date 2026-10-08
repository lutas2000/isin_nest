<script setup lang="ts">
import { inject, onMounted, ref, watch, type Ref } from 'vue';
import LegacyMasterForm from './LegacyMasterForm.vue';
import LegacyDrawingPanel from './LegacyDrawingPanel.vue';
import LegacyPartSalesWindow from './LegacyPartSalesWindow.vue';
import { legacyGet } from '../services/legacyApi';
import type { DrawingShape } from '../utils/legacyDocumentPaper';
import { PART_DRAFT_KEY, type PartDraft } from '../utils/partDraft';
import { PART_MODEL_HINT } from '../utils/statusHints';

// 工件建檔 as on Win7 (isin_vb6 docs/legacy-ui-spec.md): one column of fields
// with the drawing preview to the right, drawn like the legacy DxfPainter from
// the part's DXF in the legacy folder (backend legacy-crm/drawings).
defineProps({ title: { type: String, required: true } });

type Current = Record<string, any>;
const priceField = (key: string, label: string) => ({
  key,
  label,
  size: 'short',
  decimals: 2,
});
const columns = [
  [
    { key: 'drawing_no', label: '電腦圖號', size: 'short', maxLength: 10 },
    {
      key: 'customer_code',
      label: '客　　戶',
      size: 'short',
      maxLength: 10,
      onChange: (current: Current) => lookupCustomer(current.customer_code),
      assist: {
        kind: 'customer',
        apply: (current: Current, row: Current) => {
          current.customer_code = row.code;
          void lookupCustomer(row.code);
        },
      },
    },
    {
      key: 'customer_model',
      label: '客戶型號',
      size: 'wider',
      maxLength: 40,
      hint: PART_MODEL_HINT,
      assist: {
        kind: 'part-model',
        required: '至少輸入一個字',
        apply: (current: Current, row: Current) => {
          current.customer_model = row.customer_model;
        },
      },
    },
    { key: 'drawing_name', label: '圖　　名', size: 'wider', maxLength: 30 },
    {
      key: 'actor_no',
      label: '繪 圖 者',
      size: 'short',
      maxLength: 6,
      assist: {
        kind: 'employee',
        apply: (current: Current, row: Current) => {
          current.actor_no = row.code;
          current.actor = row.name;
        },
      },
    },
    { key: 'drawing_date', label: '繪製日期', size: 'short', maxLength: 10 },
    { key: 'directory_path', label: '目錄位置', size: 'file', maxLength: 50 },
    { key: 'cnc1', label: 'CNC 檔一', size: 'file', maxLength: 30 },
    { key: 'cnc2', label: 'CNC 檔二', size: 'file', maxLength: 30 },
    // 加工內容 is the legacy CNC5 (Win7 2026-10-07).
    { key: 'cnc5', label: '加工內容', size: 'wider', maxLength: 50 },
    { key: 'notes', label: '備　　註', size: 'wider', maxLength: 50 },
    { key: 'material', label: '材料規格', size: 'short', maxLength: 10 },
    { key: 'thickness', label: '厚　　度', size: 'short', maxLength: 4 },
    { key: 'unit', label: '單　　位', size: 'short', maxLength: 2 },
    priceField('price_ref', '備料單價'),
    priceField('price1', '代料單價'),
    priceField('price2', '折工單價'),
    priceField('price3', '備折單價'),
    priceField('price4', '代折單價'),
    priceField('price5', '外包單價'),
  ],
];

function blank() {
  return {
    drawing_no: '',
    drawing_name: '',
    drawing_ref: '',
    customer_code: '',
    customer_model: '',
    material: '',
    thickness: '',
    unit: '',
    actor_no: '',
    actor: '',
    drawing_date: '',
    directory_path: '',
    cnc1: '',
    cnc2: '',
    cnc3: '',
    cnc4: '',
    cnc5: '',
    notes: '',
    yy: '',
    price_ref: '',
    price1: '',
    price2: '',
    price3: '',
    price4: '',
    price5: '',
    latest_sale_date: '',
  };
}

const queryColumns = [
  { key: 'number', label: '電腦圖號' },
  { key: 'customer_model', label: '客戶型號' },
  { key: 'material', label: '材質' },
  { key: 'thickness', label: '厚度' },
  { key: 'customer_code', label: '客戶' },
];

// The customer's short name beside the code.
const customerName = ref('');
let customerToken = 0;
async function lookupCustomer(code: unknown) {
  const token = ++customerToken;
  customerName.value = '';
  const value = String(code ?? '').trim();
  if (!value) return;
  try {
    const payload = await legacyGet<{ item: Current }>(
      `/partners/customer/${encodeURIComponent(value)}`,
    );
    if (token === customerToken)
      customerName.value = payload.item.short_name || payload.item.full_name;
  } catch {
    // Leave the name blank when the customer is not on file.
  }
}

// 出貨記錄 lists the sales of the part on screen.
const salesFor = ref<{ drawingNo: string; customerCode: string } | null>(null);
function showSales(selectedKey: string | null, current: Current) {
  if (selectedKey != null)
    salesFor.value = {
      drawingNo: String(selectedKey),
      customerCode: String(current.customer_code ?? '').trim(),
    };
}

// 訂單登錄 F2 hands over a new part to fill in (LegacyShell.vue).
const form = ref<InstanceType<typeof LegacyMasterForm> | null>(null);
const partDraft = inject<Ref<PartDraft | null>>(PART_DRAFT_KEY, ref(null));
let takenDraft = 0;
function takeDraft() {
  const draft = partDraft.value;
  if (!draft || draft.id === takenDraft || !form.value) return;
  takenDraft = draft.id;
  form.value.addWith(draft.values);
}
onMounted(takeDraft);
watch(partDraft, takeDraft);

// The legacy form draws {drawing no}.DXF of the record on screen, looked up
// by its customer as the printouts do; nothing is drawn when it is missing.
const shape = ref<DrawingShape | null>(null);
let shapeToken = 0;
async function drawPreview(current: Current) {
  const token = ++shapeToken;
  shape.value = null;
  const number = String(current.drawing_no ?? '').trim();
  if (!number) return;
  try {
    const params = new URLSearchParams({
      numbers: number,
      customer: String(current.customer_code ?? '').trim(),
    });
    const payload = await legacyGet<{ shapes?: Record<string, DrawingShape> }>(
      `/drawings/shapes?${params}`,
    );
    if (token === shapeToken) shape.value = payload.shapes?.[number] ?? null;
  } catch {
    // Leave the preview blank, as the legacy form does without a drawing.
  }
}

// A record being added shows a blank preview, as F2 left it on Win7.
function loaded(current: Current) {
  void lookupCustomer(current.customer_code);
  if (form.value?.mode === 'new') {
    shapeToken += 1;
    shape.value = null;
  } else void drawPreview(current);
}

// CNC 檔一／二「...」: the legacy dialog「CNC檔名設定」keeps only the file
// name of the CNC file chosen, so a local file picker gives the same value.
const cncInput = ref<HTMLInputElement | null>(null);
let cncTarget: { current: Current; key: string } | null = null;
function chooseCnc(current: Current, key: string) {
  if (!cncInput.value) return;
  cncTarget = { current, key };
  cncInput.value.value = '';
  cncInput.value.click();
}
function cncChosen(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file && cncTarget)
    cncTarget.current[cncTarget.key] = file.name.slice(0, 30);
  cncTarget = null;
}
</script>

<template>
  <LegacyMasterForm
    ref="form"
    :title="title"
    browse-type="parts"
    add-after-save
    endpoint="/parts"
    key-field="drawing_no"
    :columns="columns"
    :blank="blank"
    :query-columns="queryColumns"
    query-title="工件資料查詢"
    noun="工件"
    @loaded="loaded"
  >
    <template #buttons="{ current, mode, selectedKey }">
      <button
        type="button"
        :disabled="mode === 'new' || selectedKey == null"
        @click="showSales(selectedKey, current)"
      >
        出貨記錄
      </button>
    </template>
    <template #after-customer_code>
      <input
        class="short legacy-master-side"
        :value="customerName"
        disabled
        aria-label="客戶名稱"
      />
    </template>
    <template #after-actor_no="{ current, editable }">
      <input
        v-model="current.actor"
        class="short legacy-master-side"
        :disabled="!editable"
        maxlength="8"
        aria-label="繪圖者姓名"
      />
    </template>
    <template #after-drawing_date="{ current }">
      <span class="legacy-master-inline-label">最近交易：</span>
      <input
        class="short num"
        :value="current.cnc3"
        disabled
        aria-label="最近交易"
      />
    </template>
    <!-- 目錄位置 picked a folder on Win7; a browser cannot give its path, and no part has used it since 87 年, so it is typed. -->
    <template #after-directory_path>
      <button
        type="button"
        class="legacy-browse-button"
        disabled
        title="瀏覽器無法取得資料夾路徑，請直接輸入"
      >
        ...
      </button>
    </template>
    <template
      v-for="key in ['cnc1', 'cnc2']"
      :key="key"
      #[`after-${key}`]="{ current, editable }"
    >
      <button
        type="button"
        class="legacy-browse-button"
        :disabled="!editable"
        title="CNC檔名設定"
        @click="chooseCnc(current, key)"
      >
        ...
      </button>
    </template>
    <template #aside>
      <div class="legacy-part-preview">
        <LegacyDrawingPanel :shape="shape" />
      </div>
      <input
        ref="cncInput"
        class="sr-only"
        type="file"
        accept=".cnc,.CNC"
        @change="cncChosen"
      />
    </template>
  </LegacyMasterForm>
  <LegacyPartSalesWindow
    v-if="salesFor"
    :drawing-no="salesFor.drawingNo"
    :customer-code="salesFor.customerCode"
    @close="salesFor = null"
  />
</template>
