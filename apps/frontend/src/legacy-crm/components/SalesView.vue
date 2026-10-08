<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import LegacyAssistHost from './LegacyAssistHost.vue';
import LegacyDocumentPrint from './LegacyDocumentPrint.vue';
import LegacyDrawingWindow from './LegacyDrawingWindow.vue';
import LegacyPartSalesWindow from './LegacyPartSalesWindow.vue';
import LegacyQueryWindow from './LegacyQueryWindow.vue';
import LegacyRecordToolbar from './LegacyRecordToolbar.vue';
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
} from '../utils/legacyAssist';
import {
  navigateDocument,
  queryDocuments,
  useNewDocumentNumber,
  type BrowseDirection,
} from '../utils/legacyBrowse';
import { splitSaleTax } from '../utils/salesTax';
import { lineKeyItems } from '../utils/lineKeys';
import { useCloseWindow } from '../utils/legacyWindow';
import {
  assignMissingLegacySerials,
  ensureTrailingBlankLine,
  padTransactionLines,
  type TransactionLine,
} from '../utils/transactionLines';
import { ASSIST_HINT, FORM_HINT, LINE_HINTS } from '../utils/statusHints';

// 出貨登錄 (isin_vb6 src/components/SalesView.vue). A user with `crm` read
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

const customers = ref<Row[]>([]);
const parts = ref<Row[]>([]);
const selectedKey = ref<string | null>(null);
const current = ref<Row>(blankSale());
const mode = ref('view');
useNewDocumentNumber('sales', current, mode, 'sale_no', 'sale_date');
const queryState = ref<QueryState | null>(null);
const printState = ref<DocumentPrint | null>(null);
const closeWindow = useCloseWindow();
const assist = useLegacyAssist();
const errorMessage = ref('');
const statusMessage = ref('');
const readOnly = useLegacyReadOnly();
// A record is shown or being added; the amounts then show as typed.
const isOpen = computed(() => mode.value === 'new' || mode.value === 'edit');
const isEditable = computed(() => !readOnly.value && isOpen.value);
const lock = useLegacyFieldLock(isEditable, mode);
const subtotal = computed(() =>
  (current.value.items as Row[]).reduce(
    (sum, item) => sum + lineAmount(item),
    0,
  ),
);
// 貨款 is the line total less the tax when the tax is included in it.
const goods = computed(() =>
  String(current.value.tax_mode ?? '').trim() === '內含'
    ? subtotal.value - numeric(current.value.tax_amount)
    : subtotal.value,
);
const total = computed(
  () =>
    goods.value +
    numeric(current.value.tax_amount) -
    numeric(current.value.discount_amount),
);

// Changing a line or 營業稅別 works the tax out again, as the legacy form
// does; a record just opened keeps the tax it was saved with.
watch(
  () => [current.value, subtotal.value, current.value.tax_mode] as const,
  ([record], [previous]) => {
    if (record !== previous || !isEditable.value) return;
    const { tax } = splitSaleTax(subtotal.value, record.tax_mode);
    record.tax_amount = tax ? String(tax) : '';
  },
);

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
    material: '',
    thickness: '',
    outsource: '',
    quantity: '',
    unit: '',
    unit_price: '',
  };
}

function blankSale(): Row {
  return {
    sale_no: '',
    sale_date: todayLegacyDate(),
    legacy_date_e: '',
    customer_code: '',
    customer_name: '',
    actor_no: '',
    actor_name: 'MASTER',
    linked_order_no: '',
    payment_method: '',
    delivery_method: '',
    invoice_number: '',
    shipping_address: '',
    note: '',
    tax_mode: '',
    tax_amount: '',
    discount_amount: '',
    received_amount: '0',
    items: Array.from({ length: 15 }, (_, index) => blankLine(index + 1)),
  };
}

function numeric(value: unknown) {
  const result = value == null || value === '' ? 0 : Number(value);
  return Number.isFinite(result) ? result : 0;
}

function lineAmount(item: Row) {
  return (
    Math.round(numeric(item.quantity) * numeric(item.unit_price) * 10000) /
    10000
  );
}

// The legacy form shows stored amounts with two decimals; blank stays blank.
function fixed2(value: unknown) {
  return value == null || value === '' ? '' : numeric(value).toFixed(2);
}

function recordKey(sale: Row | null | undefined): string | null {
  return sale?.sale_no ?? null;
}

function rowHasData(item: Row) {
  const textFields = [
    'legacy_sn',
    'drawing_no',
    'customer_model',
    'material',
    'thickness',
    'outsource',
    'unit',
  ];
  return (
    textFields.some((field) => String(item[field] ?? '').trim() !== '') ||
    ['quantity', 'unit_price'].some(
      (field) => item[field] != null && String(item[field]).trim() !== '',
    )
  );
}

function saleForSave(sale: Row) {
  return {
    ...sale,
    items: assignMissingLegacySerials(
      (sale.items as Row[]).filter(rowHasData).map(
        (item): TransactionLine => ({
          ...item,
          line_no: item.line_no,
          legacy_date_r: item.legacy_date_r ?? sale.sale_date,
          legacy_factor_no: item.legacy_factor_no ?? sale.customer_code,
          legacy_factor: item.legacy_factor ?? sale.customer_name,
        }),
      ),
    ),
  };
}

function withVisibleRows(sale: Row): Row {
  const items = padTransactionLines(
    ((sale.items ?? []) as Row[]).map((item) => ({
      ...blankLine(item.line_no),
      ...item,
    })),
    15,
    blankLine,
  );
  return { ...blankSale(), ...sale, items };
}

function selectSale(sale: Row) {
  selectedKey.value = recordKey(sale);
  current.value = withVisibleRows(sale);
  mode.value = 'edit';
  savedForm = JSON.stringify(current.value);
  errorMessage.value = '';
  statusMessage.value = '';
}

async function openSale(saleNo: string) {
  try {
    const payload = await legacyGet<{ item: Row }>(
      `/sales/${encodeURIComponent(saleNo)}`,
    );
    selectSale(payload.item);
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

function addSale() {
  selectedKey.value = null;
  current.value = blankSale();
  mode.value = 'new';
  errorMessage.value = '';
  statusMessage.value = '';
}

// 更新 F6 saves the record as changed on the form, after the legacy
// 「確定修改這筆資料？」.
async function editSale() {
  if (selectedKey.value == null || mode.value !== 'edit') return;
  if (!window.confirm('確定修改這筆資料？')) return;
  await saveSale();
}

async function cancelEdit() {
  if (mode.value === 'new') {
    selectedKey.value = null;
    current.value = blankSale();
    mode.value = 'view';
  } else if (selectedKey.value != null) await openSale(selectedKey.value);
  errorMessage.value = '';
  statusMessage.value = '';
}

async function saveSale() {
  if (readOnly.value) return;
  errorMessage.value = '';
  statusMessage.value = '';
  const isNew = mode.value === 'new';
  const sale = saleForSave(current.value);
  const path = isNew
    ? '/sales'
    : `/sales/${encodeURIComponent(selectedKey.value ?? '')}`;
  try {
    const payload = await legacySend<{ item: Row }>(
      path,
      isNew ? 'POST' : 'PUT',
      sale,
    );
    selectSale(payload.item);
    statusMessage.value = '存檔完成';
    if (isNew) await previewThenAdd();
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

// Unlike the order form, the legacy 出貨登錄 does not move on after 刪除: the
// form empties, keeping only the deleted 出貨編號 (seen on Win7 2026-10-07).
async function deleteSale() {
  if (selectedKey.value == null || readOnly.value) return;
  if (!window.confirm('確定刪除這筆資料？')) return;
  const deletedKey = selectedKey.value;
  try {
    await legacySend(`/sales/${encodeURIComponent(deletedKey)}`, 'DELETE');
    selectedKey.value = null;
    current.value = {
      ...blankSale(),
      sale_no: deletedKey,
      sale_date: '',
      actor_name: '',
    };
    mode.value = 'view';
    statusMessage.value = '已刪除';
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

function syncCustomer() {
  const customer = customers.value.find(
    (item) => item.code === current.value.customer_code,
  );
  if (!customer) return;
  current.value.customer_name = Array.from(String(customer.full_name ?? ''))
    .slice(0, 10)
    .join('');
  current.value.shipping_address ||=
    customer.shipping_address || customer.address;
}

function syncPart(item: Row) {
  const part = parts.value.find(
    (entry) => entry.drawing_no === item.drawing_no,
  );
  if (!part) return;
  item.customer_model ||= part.customer_model;
  item.material = part.material;
  item.thickness = part.thickness;
  item.unit ||= part.unit;
}

// 頭筆／上筆／下筆／尾筆 step through 出貨編號 in text order.
async function navigate(direction: BrowseDirection) {
  if (mode.value === 'new') return;
  errorMessage.value = '';
  try {
    const number = await navigateDocument(
      'sales',
      direction,
      selectedKey.value ?? '',
    );
    if (number) await openSale(number);
    else
      statusMessage.value =
        direction === 'next' || direction === 'last'
          ? '已是最後一筆'
          : '已是第一筆';
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

// 查詢 lists the documents matching the typed number and customer code.
async function openQuery() {
  const state: QueryState = {
    rows: [],
    loading: true,
    error: '',
    truncated: false,
  };
  queryState.value = state;
  try {
    const payload = await queryDocuments('sales', {
      number: current.value.sale_no,
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
  await openSale(row.number);
}

// Typing a complete number and pressing Enter shows that document.
async function lookupNumber() {
  if (mode.value === 'new' || !current.value.sale_no.trim()) return;
  await openSale(current.value.sale_no.trim());
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
      'sale',
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
      'sale',
      selectedKey.value ?? '',
    );
    addAfterPrint = true;
  } catch (error) {
    addSale();
    errorMessage.value = (error as Error).message;
  }
}

function closePrint() {
  printState.value = null;
  if (addAfterPrint) {
    addAfterPrint = false;
    addSale();
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

// Detail keys (Win7):「F3插入一筆，F4刪除此筆，F11秀圖，F12交易歷史」; F12 is
// the 出貨記錄 of the row's drawing for this customer.
const drawingFor = ref<string | null>(null);
const salesFor = ref<string | null>(null);
const drawingAt = (index: number) =>
  String(current.value.items[index]?.drawing_no ?? '').trim();
function lineKey(event: KeyboardEvent) {
  const items = lineKeyItems(event, current.value.items, {
    blank: blankLine,
    minimum: 15,
    actions: {
      F11: (index) => {
        if (drawingAt(index)) drawingFor.value = drawingAt(index);
      },
      F12: (index) => {
        if (drawingAt(index)) salesFor.value = drawingAt(index);
      },
    },
  });
  if (items && isEditable.value) {
    current.value.items = items;
    lineChanged();
  }
}

// F1 輔助輸入 on each field, as the legacy 出貨登錄 does it. A user with
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

// 訂單編號 F1 lists the open orders; choosing one copies its customer,
// terms and the quantities still to ship.
function assistOrder() {
  assistEdit('open-order', {
    prefix: current.value.linked_order_no,
    customer: current.value.customer_code,
    onSelect: (order) => {
      Object.assign(current.value, {
        linked_order_no: order.order_no,
        customer_code: order.customer_code,
        customer_name: order.customer_name,
        payment_method: order.payment_method ?? '',
        delivery_method: order.delivery_method ?? '',
        shipping_address: '',
      });
      // The order's own customer name stays; the customer file adds the address.
      syncCustomer();
      current.value.customer_name = order.customer_name;
      // Only a new sale takes the order's lines; on a shown sale the legacy
      // form changes the header alone.
      if (mode.value !== 'new') return;
      const lines = (order.lines as Row[])
        .map(
          (line): Row => ({
            ...line,
            remaining: Number(line.quantity ?? 0) - Number(line.shipped ?? 0),
          }),
        )
        .filter((line) => line.remaining > 0)
        .map((line, index) => ({
          ...blankLine(index + 1),
          drawing_no: line.drawing_no ?? '',
          customer_model: line.customer_model ?? '',
          material: line.material ?? '',
          thickness: line.thickness ?? '',
          outsource: line.outsource ?? '',
          quantity: line.remaining.toFixed(2),
          unit: line.unit ?? '',
        }));
      current.value.items = padTransactionLines(lines, 15, blankLine);
      lineChanged();
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
      lineChanged();
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

function cycleOutsource(item: Row) {
  if (!isEditable.value) return;
  item.outsource = nextCycleValue(ASSIST_CYCLES.outsource, item.outsource);
  lineChanged();
}

function cycleTax() {
  if (!isEditable.value) return;
  current.value.tax_mode = nextCycleValue(
    ASSIST_CYCLES.tax,
    current.value.tax_mode,
  );
}

function typed(event: Event) {
  return (event.target as HTMLInputElement).value;
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
      @add="addSale"
      @edit="editSale"
      @cancel="cancelEdit"
      @save="saveSale"
      @delete="deleteSale"
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
        <div class="legacy-form-fields legacy-form-fields-nested">
          <div class="legacy-form-column">
            <label class="legacy-form-field"
              ><span>出貨編號</span
              ><input
                v-model="current.sale_no"
                :data-hint="FORM_HINT"
                maxlength="10"
                @keydown.enter.prevent="lookupNumber"
                @keydown.f1.prevent="openQuery"
            /></label>
            <label class="legacy-form-field"
              ><span>出貨日期</span
              ><input
                v-model="current.sale_date"
                class="num"
                v-bind="lock"
                maxlength="10"
            /></label>
            <div class="legacy-form-field">
              <span>客　　戶</span>
              <input
                v-model="current.customer_code"
                :data-hint="ASSIST_HINT"
                maxlength="10"
                aria-label="客戶編號"
                @change="isEditable && syncCustomer()"
                @keydown.enter.prevent="
                  isEditable ? syncCustomer() : openQuery()
                "
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
              <span>經 手 人</span>
              <input
                v-model="current.actor_no"
                :data-hint="ASSIST_HINT"
                v-bind="lock"
                maxlength="10"
                aria-label="經手人編號"
                @keydown.f1.prevent="assistActor"
              />
              <input
                v-model="current.actor_name"
                v-bind="lock"
                maxlength="10"
                aria-label="經手人"
              />
            </div>
          </div>
          <div class="legacy-form-column">
            <label class="legacy-form-field"
              ><span>訂單編號</span
              ><input
                v-model="current.linked_order_no"
                :data-hint="ASSIST_HINT"
                v-bind="lock"
                maxlength="10"
                @keydown.f1.prevent="assistOrder"
            /></label>
            <label class="legacy-form-field"
              ><span>收款方式</span
              ><input
                v-model="current.payment_method"
                v-bind="lock"
                maxlength="10"
            /></label>
            <label class="legacy-form-field"
              ><span>送貨方式</span
              ><input
                v-model="current.delivery_method"
                v-bind="lock"
                maxlength="10"
            /></label>
            <label class="legacy-form-field"
              ><span>發票號碼</span
              ><input
                v-model="current.invoice_number"
                v-bind="lock"
                maxlength="30"
            /></label>
          </div>
        </div>
        <label class="legacy-form-field"
          ><span>送貨地址</span
          ><input
            v-model="current.shipping_address"
            class="wider"
            v-bind="lock"
            maxlength="60"
        /></label>
        <label class="legacy-form-field"
          ><span>備　　註</span
          ><input
            v-model="current.note"
            class="wider"
            v-bind="lock"
            maxlength="50"
        /></label>
      </div>
      <div class="legacy-form-column">
        <label class="legacy-form-field"
          ><span>貨　　款</span
          ><input class="num" :value="fixed2(goods)" disabled
        /></label>
        <label class="legacy-form-field"
          ><span>營業稅別</span
          ><input
            v-model="current.tax_mode"
            v-bind="lock"
            maxlength="10"
            @keydown.f1.prevent="cycleTax"
        /></label>
        <label class="legacy-form-field"
          ><span>營業稅額</span
          ><input
            class="num"
            :value="isOpen ? current.tax_amount : fixed2(current.tax_amount)"
            v-bind="lock"
            inputmode="decimal"
            @input="current.tax_amount = typed($event)"
        /></label>
        <label class="legacy-form-field"
          ><span>折讓金額</span
          ><input
            class="num"
            :value="
              isOpen
                ? current.discount_amount
                : numeric(current.discount_amount)
                  ? fixed2(current.discount_amount)
                  : ''
            "
            v-bind="lock"
            inputmode="decimal"
            @input="current.discount_amount = typed($event)"
        /></label>
        <label class="legacy-form-field"
          ><span>應收金額</span
          ><input class="num" :value="fixed2(total)" disabled
        /></label>
        <label class="legacy-form-field"
          ><span>已收金額</span
          ><input class="num" :value="fixed2(current.received_amount)" disabled
        /></label>
      </div>
    </form>

    <div class="legacy-grid" style="max-height: 372px">
      <table>
        <colgroup>
          <col style="width: 40px" />
          <col style="width: 96px" />
          <col style="width: 299px" />
          <col style="width: 89px" />
          <col style="width: 59px" />
          <col style="width: 59px" />
          <col style="width: 89px" />
          <col style="width: 59px" />
          <col style="width: 89px" />
          <col style="width: 96px" />
        </colgroup>
        <thead>
          <tr>
            <th>項次</th>
            <th>電腦圖號</th>
            <th>客戶型號</th>
            <th>材　質</th>
            <th>厚度</th>
            <th>代料</th>
            <th>數　量</th>
            <th>單位</th>
            <th>單　價</th>
            <th>小　計</th>
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
                :data-hint="LINE_HINTS.sales"
                v-bind="lock"
                maxlength="10"
                :aria-label="`第 ${index + 1} 列電腦圖號`"
                @change="
                  syncPart(item);
                  lineChanged();
                "
                @keydown.f1.prevent="assistPart(item)"
              />
            </td>
            <td>
              <input
                v-model="item.customer_model"
                v-bind="lock"
                maxlength="40"
                :aria-label="`第 ${index + 1} 列客戶型號`"
                @input="lineChanged"
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
                v-bind="lock"
                maxlength="10"
                :aria-label="`第 ${index + 1} 列代料`"
                @input="lineChanged"
                @keydown.f1.prevent="cycleOutsource(item)"
              />
            </td>
            <td>
              <input
                class="num"
                :value="isOpen ? item.quantity : fixed2(item.quantity)"
                v-bind="lock"
                inputmode="decimal"
                :aria-label="`第 ${index + 1} 列數量`"
                @input="
                  item.quantity = typed($event);
                  lineChanged();
                "
              />
            </td>
            <td>
              <input
                v-model="item.unit"
                v-bind="lock"
                maxlength="4"
                :aria-label="`第 ${index + 1} 列單位`"
                @input="lineChanged"
              />
            </td>
            <td>
              <input
                class="num"
                :value="isOpen ? item.unit_price : fixed2(item.unit_price)"
                v-bind="lock"
                inputmode="decimal"
                :aria-label="`第 ${index + 1} 列單價`"
                @input="
                  item.unit_price = typed($event);
                  lineChanged();
                "
              />
            </td>
            <td>
              <input
                class="num"
                :value="rowHasData(item) ? fixed2(lineAmount(item)) : ''"
                disabled
                :aria-label="`第 ${index + 1} 列小計`"
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
      title="出貨登錄查詢"
      :columns="[
        { key: 'number', label: '出貨編號' },
        { key: 'party', label: '客戶' },
        { key: 'actor', label: '經手人' },
        { key: 'date', label: '出貨日期', align: 'right' },
      ]"
      :rows="queryState.rows"
      :loading="queryState.loading"
      :error="queryState.error"
      :truncated="queryState.truncated"
      @select="chooseQuery"
      @cancel="queryState = null"
    />

    <LegacyAssistHost :assist="assist" />
    <LegacyDocumentPrint
      v-if="printState"
      :label="printState.label"
      :pages="printState.pages"
      :log="printState.log"
      @close="closePrint"
    />
    <LegacyDrawingWindow
      v-if="drawingFor"
      :drawing-no="drawingFor"
      :customer-code="current.customer_code"
      @close="drawingFor = null"
    />
    <LegacyPartSalesWindow
      v-if="salesFor"
      :drawing-no="salesFor"
      :customer-code="current.customer_code"
      @close="salesFor = null"
    />
  </section>
</template>
