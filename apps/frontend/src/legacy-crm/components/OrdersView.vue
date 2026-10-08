<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue';
import LegacyAssistHost from './LegacyAssistHost.vue';
import LegacyDocumentPrint from './LegacyDocumentPrint.vue';
import LegacyDrawingWindow from './LegacyDrawingWindow.vue';
import LegacyPartSalesWindow from './LegacyPartSalesWindow.vue';
import LegacyQueryWindow from './LegacyQueryWindow.vue';
import LegacyRecordToolbar from './LegacyRecordToolbar.vue';
import LegacySelectionWindow from './LegacySelectionWindow.vue';
import { legacyGet, legacySend } from '../services/legacyApi';
import {
  buildDocumentPrint,
  type DocumentPrint,
} from '../utils/documentPrinting';
import { useLegacyFieldLock, useLegacyReadOnly } from '../utils/legacyAccess';
import {
  ASSIST_CYCLES,
  nextCycleValue,
  useLegacyAssist,
  type AssistOpenOptions,
  type AssistRow,
} from '../utils/legacyAssist';
import {
  navigateDocument,
  neighbourDocument,
  queryDocuments,
  useNewDocumentNumber,
  type BrowseDirection,
} from '../utils/legacyBrowse';
import { lineKeyItems } from '../utils/lineKeys';
import { OPEN_PART_DRAFT_KEY } from '../utils/partDraft';
import {
  QUOTE_HISTORY_COLUMNS,
  QUOTE_HISTORY_HINT,
  loadQuoteHistory,
  placeQuoteRows,
} from '../utils/quoteHistory';
import { useCloseWindow } from '../utils/legacyWindow';
import {
  assignMissingLegacySerials,
  ensureTrailingBlankLine,
  padTransactionLines,
  type TransactionLine,
} from '../utils/transactionLines';
import {
  ASSIST_HINT,
  FORM_HINT,
  LINE_HINTS,
  PHRASE_HINT,
} from '../utils/statusHints';

// 訂單登錄 (isin_vb6 src/components/OrdersView.vue). A user with `crm` read
// only can browse, query and print; the fields cannot be changed
// (utils/legacyAccess.ts useLegacyFieldLock).
defineProps({ title: { type: String, required: true } });

type Row = Record<string, any>;
interface QueryState {
  rows: Row[];
  loading: boolean;
  error: string;
  truncated: boolean;
}
interface PickerState {
  index: number;
  rows: AssistRow[];
  loading: boolean;
  error: string;
}

const customers = ref<Row[]>([]);
const parts = ref<Row[]>([]);
const selectedKey = ref<string | null>(null);
const current = ref<Row>(blankOrder());
const mode = ref('view');
useNewDocumentNumber('orders', current, mode, 'order_no', 'order_date');
const queryState = ref<QueryState | null>(null);
const printState = ref<DocumentPrint | null>(null);
const closeWindow = useCloseWindow();
const assist = useLegacyAssist();
const errorMessage = ref('');
const statusMessage = ref('');
const readOnly = useLegacyReadOnly();
const isEditable = computed(
  () => !readOnly.value && (mode.value === 'new' || mode.value === 'edit'),
);
const lock = useLegacyFieldLock(isEditable, mode);
const paymentOptions = ['收現', '月結', '訂單完工'];
const deliveryOptions = ['客戶取件', '送達客戶', '寄貨', '指送'];

function todayLegacyDate() {
  const today = new Date();
  const year = today.getFullYear() - 1911;
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function blankLine(lineNo: number): Row & { line_no: number } {
  return {
    line_no: lineNo,
    legacy_sn: '',
    drawing_no: '',
    customer_model: '',
    quantity: '',
    unit: '',
    material: '',
    thickness: '',
    outsource: '',
    source: '',
    post_process: '',
    shipped_quantity: '',
    legacy_d_dwgok: '',
  };
}

function blankOrder(): Row {
  return {
    order_no: '',
    order_date: todayLegacyDate(),
    delivery_date: todayLegacyDate(),
    customer_code: '',
    customer_name: '',
    actor_no: '',
    actor_name: 'MASTER',
    payment_method: '',
    delivery_method: '',
    note: '',
    note2: '',
    closed: '',
    legacy_xx: '',
    items: Array.from({ length: 15 }, (_, index) => blankLine(index + 1)),
  };
}

function recordKey(order: Row | null | undefined): string | null {
  return order?.order_no ?? null;
}

function rowHasData(item: Row) {
  const textFields = [
    'drawing_no',
    'customer_model',
    'unit',
    'material',
    'thickness',
    'outsource',
    'source',
    'post_process',
    'legacy_sn',
    'legacy_date_r',
    'legacy_date_e',
    'legacy_factor_no',
    'legacy_factor',
    'legacy_d_dwgok',
  ];
  return (
    textFields.some((field) => String(item[field] ?? '').trim() !== '') ||
    ['quantity', 'shipped_quantity'].some(
      (field) => item[field] != null && String(item[field]).trim() !== '',
    )
  );
}

function orderForSave(order: Row) {
  return {
    ...order,
    items: assignMissingLegacySerials(
      (order.items as Row[]).filter(rowHasData).map(
        (item): TransactionLine => ({
          ...item,
          line_no: item.line_no,
          legacy_date_r: item.legacy_date_r ?? order.order_date,
          legacy_date_e: item.legacy_date_e ?? order.delivery_date,
          legacy_factor_no: item.legacy_factor_no ?? order.customer_code,
          legacy_factor: item.legacy_factor ?? order.customer_name,
        }),
      ),
    ),
  };
}

function withVisibleRows(order: Row): Row {
  const items = padTransactionLines(
    ((order.items ?? []) as Row[]).map((item) => ({
      ...blankLine(item.line_no),
      ...item,
    })),
    15,
    blankLine,
  );
  return { ...blankOrder(), ...order, items };
}

function selectOrder(order: Row) {
  selectedKey.value = recordKey(order);
  current.value = withVisibleRows(order);
  mode.value = 'edit';
  savedForm = JSON.stringify(current.value);
  errorMessage.value = '';
  statusMessage.value = '';
}

async function openOrder(orderNo: string) {
  try {
    const payload = await legacyGet<{ item: Row }>(
      `/orders/${encodeURIComponent(orderNo)}`,
    );
    selectOrder(payload.item);
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

async function loadLookups() {
  const [customerResult, partResult] = await Promise.allSettled([
    legacyGet<{ items: Row[] }>('/partners?kind=customer'),
    legacyGet<{ items: Row[] }>('/parts'),
  ]);
  if (customerResult.status === 'fulfilled')
    customers.value = customerResult.value.items;
  if (partResult.status === 'fulfilled') parts.value = partResult.value.items;
}

function addOrder() {
  selectedKey.value = null;
  current.value = blankOrder();
  mode.value = 'new';
  errorMessage.value = '';
  statusMessage.value = '';
}

// 更新 F6 saves the record as changed on the form, after the legacy
// 「確定修改這筆資料？」.
async function editOrder() {
  if (selectedKey.value == null || mode.value !== 'edit') return;
  if (!window.confirm('確定修改這筆資料？')) return;
  await saveOrder();
}

async function cancelEdit() {
  if (mode.value === 'new' || selectedKey.value == null) {
    selectedKey.value = null;
    current.value = blankOrder();
    mode.value = 'view';
  } else {
    await openOrder(selectedKey.value);
  }
  errorMessage.value = '';
  statusMessage.value = '';
}

async function saveOrder() {
  if (readOnly.value) return;
  errorMessage.value = '';
  statusMessage.value = '';
  const isNew = mode.value === 'new';
  const order = orderForSave(current.value);
  const path = isNew
    ? '/orders'
    : `/orders/${encodeURIComponent(selectedKey.value ?? '')}`;
  try {
    const payload = await legacySend<{ item: Row }>(
      path,
      isNew ? 'POST' : 'PUT',
      order,
    );
    selectOrder(payload.item);
    statusMessage.value = '存檔完成';
    if (isNew) await previewThenAdd();
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

async function deleteOrder() {
  if (selectedKey.value == null || readOnly.value) return;
  if (!window.confirm('確定刪除這筆資料？')) return;
  const deletedKey = selectedKey.value;
  try {
    // The record to show next, found while the deleted one is still on file.
    const neighbour = await neighbourDocument('orders', deletedKey);
    await legacySend(`/orders/${encodeURIComponent(deletedKey)}`, 'DELETE');
    selectedKey.value = null;
    current.value = blankOrder();
    mode.value = 'view';
    if (neighbour) await openOrder(neighbour);
    statusMessage.value = '已刪除';
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

// 頭筆／上筆／下筆／尾筆 step through order numbers in text order.
async function navigate(direction: BrowseDirection) {
  if (mode.value === 'new') return;
  errorMessage.value = '';
  try {
    const number = await navigateDocument(
      'orders',
      direction,
      selectedKey.value ?? '',
    );
    if (number) await openOrder(number);
    else
      statusMessage.value =
        direction === 'next' || direction === 'last'
          ? '已是最後一筆'
          : '已是第一筆';
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

// 查詢 lists orders matching the typed order number and customer code.
async function openQuery() {
  const state: QueryState = {
    rows: [],
    loading: true,
    error: '',
    truncated: false,
  };
  queryState.value = state;
  try {
    const payload = await queryDocuments('orders', {
      number: current.value.order_no,
      party: current.value.customer_code,
    });
    queryState.value = {
      ...state,
      rows: payload.items,
      truncated: payload.truncated,
      loading: false,
    };
  } catch (error) {
    queryState.value = {
      ...state,
      loading: false,
      error: (error as Error).message,
    };
  }
}

async function chooseQuery(row: Row) {
  queryState.value = null;
  await openOrder(row.number);
}

// Typing a complete order number and pressing Enter shows that order.
async function lookupNumber() {
  if (mode.value === 'new' || !current.value.order_no.trim()) return;
  await openOrder(current.value.order_no.trim());
}

// 列印 P and 列印標籤(L) preview the saved document.
// What the shown record looked like when loaded: 列印 P refuses a changed
// form, as the legacy one does.
let savedForm = '';

async function printDocument(kind: 'document' | 'label') {
  if (selectedKey.value == null || mode.value === 'new') return;
  if (JSON.stringify(current.value) !== savedForm) {
    window.alert('內容已變動，請先執行更新再繼續');
    return;
  }
  errorMessage.value = '';
  try {
    printState.value = await buildDocumentPrint(
      kind,
      'order',
      selectedKey.value,
    );
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

// After a new record is saved the legacy form opens its 列印 preview at once
// and, when the preview is closed, goes on to the next 新增
// (isin_vb6 docs/legacy-ui-spec.md 「單據列印」).
let addAfterPrint = false;

async function previewThenAdd() {
  try {
    printState.value = await buildDocumentPrint(
      'document',
      'order',
      selectedKey.value ?? '',
    );
    addAfterPrint = true;
  } catch (error) {
    addOrder();
    errorMessage.value = (error as Error).message;
  }
}

function closePrint() {
  printState.value = null;
  if (addAfterPrint) {
    addAfterPrint = false;
    addOrder();
  }
}

function lineChanged() {
  if (isEditable.value)
    current.value.items = ensureTrailingBlankLine(
      current.value.items,
      rowHasData,
      blankLine,
    );
}

// Detail keys (Win7 2026-10-07):「F2建立工件圖檔，F3插入一筆，F4刪除此筆，
// F8查報價記錄，F9查完成數，F11秀圖，F12查交易歷史」. F9 reads the 完工單,
// which was never used, so it is left out (isin_vb6 docs/legacy-ui-spec.md).
const openPartDraft = inject(OPEN_PART_DRAFT_KEY, null);
const quotePicker = ref<PickerState | null>(null);
const drawingFor = ref<string | null>(null);
const salesFor = ref<{ drawingNo: string; orderNo: string } | null>(null);
const drawingAt = (index: number) =>
  String(current.value.items[index]?.drawing_no ?? '').trim();
const customerCode = () => String(current.value.customer_code ?? '').trim();

function lineKey(event: KeyboardEvent) {
  const items = lineKeyItems(event, current.value.items, {
    blank: blankLine,
    minimum: 15,
    actions: {
      F2: createPart,
      F8: openQuoteHistory,
      F11: (index) => {
        if (drawingAt(index)) drawingFor.value = drawingAt(index);
      },
      F12: (index) => {
        if (drawingAt(index))
          salesFor.value = {
            drawingNo: drawingAt(index),
            orderNo: String(current.value.order_no ?? '').trim(),
          };
      },
    },
  });
  if (items && isEditable.value) {
    current.value.items = items;
    lineChanged();
  }
}

// F2 opens 工件建檔 at 新增 with the row (the legacy form saves nothing itself).
function createPart(index: number) {
  const item = current.value.items[index];
  const drawingNo = drawingAt(index);
  if (!item || !openPartDraft || !isEditable.value) return;
  openPartDraft({
    drawing_no: drawingNo,
    customer_code: customerCode(),
    customer_model: item.customer_model ?? '',
    drawing_date: todayLegacyDate(),
    cnc1: drawingNo ? `${drawingNo}.CNC` : '',
    cnc5: item.post_process ?? '',
    material: item.material ?? '',
    thickness: item.thickness ?? '',
    unit: item.unit ?? '',
  });
}

// F8「{客戶} 報價記錄」: the customer's latest quote of each item; the rows
// chosen replace the grid rows from the cursor down with their 客戶型號,
// 材質 and 厚度, every other column left blank.
async function openQuoteHistory(index: number) {
  if (!isEditable.value || !customerCode()) return;
  quotePicker.value = { index, rows: [], loading: true, error: '' };
  try {
    const rows = await loadQuoteHistory(customerCode());
    if (quotePicker.value)
      quotePicker.value = { ...quotePicker.value, rows, loading: false };
  } catch (error) {
    if (quotePicker.value)
      quotePicker.value = {
        ...quotePicker.value,
        loading: false,
        error: (error as Error).message,
      };
  }
}

function pickQuotes(keys: Set<unknown>) {
  if (!quotePicker.value) return;
  const { index, rows } = quotePicker.value;
  quotePicker.value = null;
  const chosen = rows.filter((row) => keys.has(row.key));
  current.value.items = placeQuoteRows(
    current.value.items,
    index,
    chosen,
    blankLine,
    (line, row) => ({
      ...line,
      customer_model: row.customer_model,
      material: row.material,
      thickness: row.thickness,
    }),
  );
  lineChanged();
}

function syncCustomer() {
  const customer = customers.value.find(
    (item) => item.code === current.value.customer_code,
  );
  if (customer)
    current.value.customer_name = Array.from(String(customer.full_name ?? ''))
      .slice(0, 10)
      .join('');
}

// The legacy form refuses a drawing number already on another line
// (「輸入檢查」: 「{圖號}電腦圖號重覆」).
function duplicateDrawing(item: Row) {
  const value = String(item.drawing_no ?? '').trim();
  if (
    !value ||
    !(current.value.items as Row[]).some(
      (other) =>
        other !== item && String(other.drawing_no ?? '').trim() === value,
    )
  )
    return false;
  window.alert(`${value}電腦圖號重覆`);
  item.drawing_no = '';
  return true;
}

function syncPart(item: Row) {
  if (duplicateDrawing(item)) return;
  const part = parts.value.find(
    (entry) => entry.drawing_no === item.drawing_no,
  );
  if (part) {
    item.customer_model ||= part.customer_model;
    item.material = part.material;
    item.thickness = part.thickness;
    item.unit ||= part.unit;
  }
  lineChanged();
}

// F1 輔助輸入 on each field, as the legacy 訂單登錄 does it. A user with
// `crm` read only may open the lists, but choosing a row changes nothing.
function assistEdit(kind: string, options: AssistOpenOptions) {
  void assist.open(kind, {
    ...options,
    onSelect: (row) => {
      if (isEditable.value) options.onSelect(row);
    },
  });
}

function assistCustomer() {
  void assist.open('customer', {
    prefix: current.value.customer_code,
    onSelect: (row) => {
      current.value.customer_code = row.code;
      if (isEditable.value) syncCustomer();
    },
  });
}

function assistActor() {
  assistEdit('employee', {
    prefix: current.value.actor_no,
    onSelect: (row) => {
      current.value.actor_no = row.code;
      current.value.actor_name = row.name;
    },
  });
}

function assistGroup() {
  assistEdit('group', {
    customer: current.value.customer_code,
    onSelect: (row) => {
      current.value.note = row.group_no;
    },
  });
}

function assistPart(item: Row) {
  assistEdit('part', {
    prefix: item.drawing_no,
    customer: current.value.customer_code,
    onSelect: (row) => {
      item.drawing_no = row.drawing_no;
      syncPart(item);
    },
  });
}

function assistMaterial(item: Row) {
  assistEdit('material', {
    onSelect: (row) => {
      item.material = row.material;
      item.thickness = row.thickness;
      lineChanged();
    },
  });
}

function cycle(item: Row, field: string, values: string[]) {
  if (!isEditable.value) return;
  item[field] = nextCycleValue(values, item[field]);
  lineChanged();
}

function assistPhrase(item: Row) {
  if (!isEditable.value) return;
  assist.phrase((content) => {
    item.post_process = `${item.post_process ?? ''}${content}`;
    lineChanged();
  });
}

onMounted(() => {
  void loadLookups();
});
</script>

<template>
  <section class="legacy-form" :aria-label="title">
    <LegacyRecordToolbar
      :mode="mode"
      :has-record="selectedKey != null"
      :print-enabled="selectedKey != null"
      label
      :label-enabled="selectedKey != null"
      @add="addOrder"
      @edit="editOrder"
      @cancel="cancelEdit"
      @save="saveOrder"
      @delete="deleteOrder"
      @query="openQuery"
      @previous="navigate('previous')"
      @next="navigate('next')"
      @first="navigate('first')"
      @last="navigate('last')"
      @print="printDocument('document')"
      @label="printDocument('label')"
      @close="closeWindow"
    />

    <form class="legacy-form-fields" @submit.prevent>
      <div class="legacy-form-column">
        <label class="legacy-form-field"
          ><span>訂單編號</span
          ><input
            v-model="current.order_no"
            :data-hint="FORM_HINT"
            maxlength="10"
            @keydown.enter.prevent="lookupNumber"
            @keydown.f1.prevent="openQuery"
        /></label>
        <label class="legacy-form-field"
          ><span>訂單日期</span
          ><input
            v-model="current.order_date"
            class="num"
            v-bind="lock"
            maxlength="10"
        /></label>
        <label class="legacy-form-field"
          ><span>交貨日期</span
          ><input
            v-model="current.delivery_date"
            class="num"
            v-bind="lock"
            maxlength="10"
        /></label>
      </div>
      <div class="legacy-form-column">
        <div class="legacy-form-field">
          <span>客　　戶</span>
          <input
            v-model="current.customer_code"
            :data-hint="ASSIST_HINT"
            maxlength="10"
            aria-label="客戶編號"
            @change="isEditable && syncCustomer()"
            @keydown.enter.prevent="isEditable ? syncCustomer() : openQuery()"
            @keydown.f1.prevent="assistCustomer"
          />
          <input
            v-model="current.customer_name"
            :data-hint="ASSIST_HINT"
            v-bind="lock"
            maxlength="10"
            aria-label="客戶名稱"
          />
        </div>
        <div class="legacy-form-field">
          <span>業　　務</span>
          <input
            v-model="current.actor_no"
            :data-hint="ASSIST_HINT"
            v-bind="lock"
            maxlength="10"
            aria-label="業務編號"
            @keydown.f1.prevent="assistActor"
          />
          <input
            v-model="current.actor_name"
            v-bind="lock"
            maxlength="10"
            aria-label="業務姓名"
          />
        </div>
        <label class="legacy-form-field"
          ><span>備　　註</span
          ><input
            v-model="current.note"
            :data-hint="ASSIST_HINT"
            class="wide"
            v-bind="lock"
            maxlength="20"
            @keydown.f1.prevent="assistGroup"
        /></label>
      </div>
      <div class="legacy-form-column">
        <label class="legacy-form-field"
          ><span>收款方式</span
          ><select
            v-model="current.payment_method"
            class="wide"
            :disabled="!isEditable"
          >
            <option value=""></option>
            <option
              v-if="
                current.payment_method &&
                !paymentOptions.includes(current.payment_method)
              "
              :value="current.payment_method"
            >
              {{ current.payment_method }}
            </option>
            <option
              v-for="option in paymentOptions"
              :key="option"
              :value="option"
            >
              {{ option }}
            </option>
          </select></label
        >
        <label class="legacy-form-field"
          ><span>送貨方式</span
          ><select
            v-model="current.delivery_method"
            class="wide"
            :disabled="!isEditable"
          >
            <option value=""></option>
            <option
              v-if="
                current.delivery_method &&
                !deliveryOptions.includes(current.delivery_method)
              "
              :value="current.delivery_method"
            >
              {{ current.delivery_method }}
            </option>
            <option
              v-for="option in deliveryOptions"
              :key="option"
              :value="option"
            >
              {{ option }}
            </option>
          </select></label
        >
      </div>
    </form>

    <div class="legacy-grid" style="max-height: 372px">
      <table>
        <colgroup>
          <col style="width: 40px" />
          <col style="width: 89px" />
          <col style="width: 239px" />
          <col style="width: 56px" />
          <col style="width: 42px" />
          <col style="width: 89px" />
          <col style="width: 49px" />
          <col style="width: 49px" />
          <col style="width: 49px" />
          <col style="width: 212px" />
          <col style="width: 59px" />
        </colgroup>
        <thead>
          <tr>
            <th>項次</th>
            <th>電腦圖號</th>
            <th>客戶型號</th>
            <th>數 量</th>
            <th>單位</th>
            <th>材　質</th>
            <th>厚度</th>
            <th>代料</th>
            <th>圖源</th>
            <th>後加工</th>
            <th>出貨數</th>
          </tr>
        </thead>
        <tbody @keydown="lineKey">
          <tr
            v-for="(item, index) in current.items"
            :key="item.line_no"
            :data-index="index"
          >
            <td class="line-no">{{ index + 1 }}</td>
            <td>
              <input
                v-model="item.drawing_no"
                :data-hint="LINE_HINTS.orders"
                v-bind="lock"
                maxlength="10"
                :aria-label="`第 ${index + 1} 列電腦圖號`"
                @change="syncPart(item)"
                @keydown.f1.prevent="assistPart(item)"
              />
            </td>
            <td>
              <input
                v-model="item.customer_model"
                :data-hint="ASSIST_HINT"
                v-bind="lock"
                maxlength="40"
                :aria-label="`第 ${index + 1} 列客戶型號`"
                @input="lineChanged"
              />
            </td>
            <td>
              <input
                v-model="item.quantity"
                class="num"
                inputmode="decimal"
                v-bind="lock"
                :aria-label="`第 ${index + 1} 列數量`"
                @input="lineChanged"
              />
            </td>
            <td>
              <input
                v-model="item.unit"
                :data-hint="ASSIST_HINT"
                v-bind="lock"
                maxlength="4"
                :aria-label="`第 ${index + 1} 列單位`"
                @input="lineChanged"
                @keydown.f1.prevent="cycle(item, 'unit', ASSIST_CYCLES.unit)"
              />
            </td>
            <td>
              <input
                v-model="item.material"
                v-bind="lock"
                maxlength="10"
                :aria-label="`第 ${index + 1} 列材質`"
                @input="lineChanged"
                @keydown.f1.prevent="assistMaterial(item)"
              />
            </td>
            <td>
              <input
                v-model="item.thickness"
                v-bind="lock"
                maxlength="4"
                :aria-label="`第 ${index + 1} 列厚度`"
                @input="lineChanged"
              />
            </td>
            <td>
              <input
                v-model="item.outsource"
                :data-hint="PHRASE_HINT"
                v-bind="lock"
                maxlength="10"
                :aria-label="`第 ${index + 1} 列代料`"
                @input="lineChanged"
                @keydown.f1.prevent="
                  cycle(item, 'outsource', ASSIST_CYCLES.outsource)
                "
              />
            </td>
            <td>
              <input
                v-model="item.source"
                v-bind="lock"
                maxlength="4"
                :aria-label="`第 ${index + 1} 列圖源`"
                @input="lineChanged"
                @keydown.f1.prevent="
                  cycle(item, 'source', ASSIST_CYCLES.source)
                "
              />
            </td>
            <td>
              <input
                v-model="item.post_process"
                v-bind="lock"
                maxlength="10"
                :aria-label="`第 ${index + 1} 列後加工`"
                @input="lineChanged"
                @keydown.f10.prevent="assistPhrase(item)"
              />
            </td>
            <td>
              <input
                v-model="item.shipped_quantity"
                class="num"
                inputmode="decimal"
                v-bind="lock"
                :aria-label="`第 ${index + 1} 列出貨數`"
                @input="lineChanged"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p
      class="legacy-form-message"
      :class="{ error: errorMessage }"
      role="status"
    >
      {{ errorMessage || statusMessage }}
    </p>

    <LegacyQueryWindow
      v-if="queryState"
      title="訂單登錄查詢"
      :columns="[
        { key: 'number', label: '訂單編號' },
        { key: 'party', label: '客戶' },
        { key: 'actor', label: '業務' },
        { key: 'date', label: '訂單日期', align: 'right' },
      ]"
      :rows="queryState.rows"
      :loading="queryState.loading"
      :error="queryState.error"
      :truncated="queryState.truncated"
      @select="chooseQuery"
      @cancel="queryState = null"
    />

    <LegacySelectionWindow
      v-if="quotePicker"
      :title="`${current.customer_name} 報價記錄`"
      :columns="QUOTE_HISTORY_COLUMNS"
      row-key="key"
      :rows="quotePicker.rows"
      :loading="quotePicker.loading"
      :error="quotePicker.error"
      :initial="[]"
      click-toggles
      mark-first
      :hint="QUOTE_HISTORY_HINT"
      @confirm="pickQuotes"
      @cancel="quotePicker = null"
    />
    <LegacyDrawingWindow
      v-if="drawingFor"
      :drawing-no="drawingFor"
      :customer-code="current.customer_code"
      @close="drawingFor = null"
    />
    <LegacyPartSalesWindow
      v-if="salesFor"
      :drawing-no="salesFor.drawingNo"
      :customer-code="current.customer_code"
      :order-no="salesFor.orderNo"
      @close="salesFor = null"
    />
    <LegacyAssistHost :assist="assist" />
    <LegacyDocumentPrint
      v-if="printState"
      :label="printState.label"
      :pages="printState.pages"
      :log="printState.log"
      @close="closePrint"
    />
  </section>
</template>
