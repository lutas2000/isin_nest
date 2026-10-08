<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import LegacyAssistHost from './LegacyAssistHost.vue';
import LegacyDocumentPrint from './LegacyDocumentPrint.vue';
import LegacyDrawingWindow from './LegacyDrawingWindow.vue';
import LegacyOrderToWorkWindow from './LegacyOrderToWorkWindow.vue';
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
  BRIEF_ORDER_COLUMNS,
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
import { useCloseWindow } from '../utils/legacyWindow';
import {
  ensureTrailingBlankLine,
  padTransactionLines,
  replaceTransactionLine,
} from '../utils/transactionLines';
import { ASSIST_HINT, FORM_HINT, LINE_HINTS } from '../utils/statusHints';

// 工作登錄 (isin_vb6 src/components/WorkView.vue). A user with `crm` read
// only can browse, query, print and show drawings (F11); 新增 with its
// 訂單轉成工作單 window and every field are closed to them
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
const orders = ref<Row[]>([]);
const selectedKey = ref<string | null>(null);
const current = ref<Row>(blankWork());
const mode = ref('view');
useNewDocumentNumber('work-orders', current, mode, 'work_no', 'transfer_date');
const queryState = ref<QueryState | null>(null);
const printState = ref<DocumentPrint | null>(null);
const convertingOrders = ref(false);
const closeWindow = useCloseWindow();
const assist = useLegacyAssist();
const errorMessage = ref('');
const statusMessage = ref('');
const readOnly = useLegacyReadOnly();
const isEditable = computed(
  () => !readOnly.value && (mode.value === 'new' || mode.value === 'edit'),
);
const lock = useLegacyFieldLock(isEditable, mode);

function todayLegacyDate() {
  const today = new Date();
  const year = today.getFullYear() - 1911;
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return year + '.' + month + '.' + day;
}

function blankItem(lineNo: number): Row & { line_no: number } {
  return {
    line_no: lineNo,
    drawing_no: '',
    material: '',
    thickness: '',
    outsource: '',
    order_quantity: '',
    completed_quantity: '',
    cnc_ok: '',
    plating_work: '',
    post_process: '',
    order_no: '',
  };
}

function blankWork(): Row {
  return {
    work_no: '',
    transfer_date: todayLegacyDate(),
    customer_code: '',
    customer_name: '',
    actor_no: '',
    actor_name: 'MASTER',
    order_no: '',
    items: Array.from({ length: 15 }, (_, index) => blankItem(index + 1)),
  };
}

function recordKey(work: Row | null | undefined): string | null {
  return work?.work_no ?? null;
}

function itemHasData(item: Row) {
  const textFields = [
    'drawing_no',
    'material',
    'thickness',
    'outsource',
    'cnc_ok',
    'plating_work',
    'post_process',
  ];
  return (
    textFields.some((field) => String(item[field] ?? '').trim() !== '') ||
    ['order_quantity', 'completed_quantity'].some(
      (field) => item[field] != null && String(item[field]).trim() !== '',
    )
  );
}

function workForSave(work: Row) {
  return { ...work, items: (work.items as Row[]).filter(itemHasData) };
}

function withVisibleRows(work: Row): Row {
  const items = padTransactionLines(
    ((work.items ?? []) as Row[]).map((item) => ({
      ...blankItem(item.line_no),
      ...item,
    })),
    15,
    blankItem,
  );
  return { ...blankWork(), ...work, items };
}

function selectWork(work: Row) {
  selectedKey.value = recordKey(work);
  current.value = withVisibleRows(work);
  mode.value = 'edit';
  savedForm = JSON.stringify(current.value);
  errorMessage.value = '';
  statusMessage.value = '';
}

async function openWork(workNo: string) {
  try {
    const payload = await legacyGet<{ item: Row }>(
      '/work-orders/' + encodeURIComponent(workNo),
    );
    selectWork(payload.item);
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

async function loadLookups() {
  const [customerResult, partResult, orderResult] = await Promise.allSettled([
    legacyGet<{ items: Row[] }>('/partners?kind=customer'),
    legacyGet<{ items: Row[] }>('/parts'),
    legacyGet<{ items: Row[] }>('/orders'),
  ]);
  if (customerResult.status === 'fulfilled')
    customers.value = customerResult.value.items;
  if (partResult.status === 'fulfilled') parts.value = partResult.value.items;
  if (orderResult.status === 'fulfilled')
    orders.value = orderResult.value.items;
}

// 新增 starts an empty work sheet and opens 「訂單轉成工作單」 over it.
function addWork() {
  if (readOnly.value) return;
  selectedKey.value = null;
  current.value = blankWork();
  mode.value = 'new';
  errorMessage.value = '';
  statusMessage.value = '';
  convertingOrders.value = true;
}

// The lines of an order as a work sheet takes them.
function workLinesFrom(order: AssistRow) {
  return ((order.lines ?? []) as Row[]).map((line) => ({
    order_no: order.order_no,
    drawing_no: line.drawing_no ?? '',
    material: line.material ?? '',
    thickness: line.thickness ?? '',
    outsource: line.outsource ?? '',
    order_quantity: line.quantity == null ? '' : String(Number(line.quantity)),
  }));
}

// Fills the new work sheet from orders: the first gives 客戶 and 訂單編號,
// and the lines of each follow one another.
function importOrders(selected: AssistRow[]) {
  if (!selected.length || !isEditable.value) return;
  const [first] = selected;
  current.value.order_no = first.order_no;
  current.value.customer_code = first.customer_code;
  current.value.customer_name = first.customer_name;
  const lines = selected
    .flatMap(workLinesFrom)
    .map((line, index) => ({ ...blankItem(index + 1), ...line }));
  current.value.items = padTransactionLines(lines, 15, blankItem);
  lineChanged();
  void fillCncOk(current.value.items);
}

// Bringing a drawing in sets CNC_OK to Y when its CNC file is on the CNC
// folder, as the legacy 工作登錄 does (backend legacy-crm/drawings); the
// column is not typed. Without a CNC folder on the server it is left as it is.
async function fillCncOk(items: Row[]) {
  const numbers = [
    ...new Set(
      items.map((item) => String(item.drawing_no ?? '').trim()).filter(Boolean),
    ),
  ];
  for (let start = 0; start < numbers.length; start += 99) {
    let status: Record<string, string> | null;
    try {
      ({ items: status } = await legacyGet<{
        items: Record<string, string> | null;
      }>(
        '/drawings/cnc?numbers=' +
          encodeURIComponent(numbers.slice(start, start + 99).join(',')),
      ));
    } catch {
      return;
    }
    if (!status) return;
    for (const item of items) {
      const number = String(item.drawing_no ?? '').trim();
      if (number in status) item.cnc_ok = status[number];
    }
  }
}

function confirmConversion(selected: AssistRow[]) {
  convertingOrders.value = false;
  importOrders(selected);
}

// 更新 F6 saves the record as changed on the form, after the legacy
// 「確定修改這筆資料？」.
async function editWork() {
  if (selectedKey.value == null || mode.value !== 'edit') return;
  if (!window.confirm('確定修改這筆資料？')) return;
  await saveWork();
}

async function cancelEdit() {
  if (mode.value === 'new') {
    selectedKey.value = null;
    current.value = blankWork();
    mode.value = 'view';
  } else if (selectedKey.value != null) await openWork(selectedKey.value);
  errorMessage.value = '';
  statusMessage.value = '';
}

async function saveWork() {
  if (readOnly.value) return;
  errorMessage.value = '';
  statusMessage.value = '';
  const isNew = mode.value === 'new';
  const work = workForSave(current.value);
  const path = isNew
    ? '/work-orders'
    : '/work-orders/' + encodeURIComponent(selectedKey.value ?? '');
  try {
    const payload = await legacySend<{ item: Row }>(
      path,
      isNew ? 'POST' : 'PUT',
      work,
    );
    selectWork(payload.item);
    statusMessage.value = '存檔完成';
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

async function deleteWork() {
  if (selectedKey.value == null || readOnly.value) return;
  if (!window.confirm('確定刪除這筆資料？')) return;
  const deletedKey = selectedKey.value;
  try {
    // The record to show next, found while the deleted one is still on file.
    const neighbour = await neighbourDocument('work-orders', deletedKey);
    await legacySend(
      '/work-orders/' + encodeURIComponent(deletedKey),
      'DELETE',
    );
    selectedKey.value = null;
    current.value = blankWork();
    mode.value = 'view';
    if (neighbour) await openWork(neighbour);
    statusMessage.value = '已刪除';
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
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

function syncOrder() {
  if (!isEditable.value) return;
  const order = orders.value.find(
    (item) => item.order_no === current.value.order_no,
  );
  if (!order) return;
  if (!current.value.customer_code)
    current.value.customer_code = order.customer_code;
  if (!current.value.customer_name)
    current.value.customer_name = order.customer_name;
}

function syncPart(item: Row) {
  void fillCncOk([item]);
  const part = parts.value.find(
    (entry) => entry.drawing_no === item.drawing_no,
  );
  if (!part) return;
  item.material ||= part.material;
  item.thickness ||= part.thickness;
}

// 頭筆／上筆／下筆／尾筆 step through 工作編號 in text order.
async function navigate(direction: BrowseDirection) {
  if (mode.value === 'new') return;
  errorMessage.value = '';
  try {
    const number = await navigateDocument(
      'work-orders',
      direction,
      selectedKey.value ?? '',
    );
    if (number) await openWork(number);
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
    const payload = await queryDocuments('work-orders', {
      number: current.value.work_no,
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
  await openWork(row.number);
}

// Typing a complete number and pressing Enter shows that document.
async function lookupNumber() {
  if (mode.value === 'new' || !current.value.work_no.trim()) return;
  await openWork(current.value.work_no.trim());
}

function lineChanged() {
  if (isEditable.value)
    current.value.items = ensureTrailingBlankLine(
      current.value.items,
      itemHasData,
      blankItem,
    );
}

// Detail keys (Win7):「F3插入一筆，F4刪除此筆，F8圖組展開，F9查完工記錄，F11秀圖」.
// F9 reads the never-used 完工單 and is left out.
const drawingFor = ref<string | null>(null);
function lineKey(event: KeyboardEvent) {
  const items = lineKeyItems(event, current.value.items, {
    blank: blankItem,
    minimum: 15,
    actions: {
      F8: expandGroup,
      F11: (index) => {
        const drawingNo = String(
          current.value.items[index]?.drawing_no ?? '',
        ).trim();
        if (drawingNo) drawingFor.value = drawingNo;
      },
    },
  });
  if (items && isEditable.value) {
    current.value.items = items;
    lineChanged();
  }
}

// F8「圖組展開」(Win7 2026-10-08): a 圖組編號 typed as the row's 電腦圖號 is
// asked about (「要將{圖組}展開」) and then replaced by the group's parts in
// line order, the rows below moving down. Each takes the group line's
// 材質／厚度 (the row's when the group line has no 材質), the row's 代料 and
// 訂單編號, and 訂單數 = group 數量 × the row's 訂單數 (blank when the row
// has none); CNC_OK is checked as for any drawing brought in.
async function expandGroup(index: number) {
  const row = current.value.items[index];
  const groupNo = String(row?.drawing_no ?? '').trim();
  if (!isEditable.value || !groupNo || !window.confirm(`要將${groupNo}展開`))
    return;
  let group: Row;
  try {
    group = (
      await legacyGet<{ item: Row }>(`/groups/${encodeURIComponent(groupNo)}`)
    ).item;
  } catch (error) {
    errorMessage.value = (error as Error).message;
    return;
  }
  if (!group?.items?.length) return;
  const rowQuantity = Number(row.order_quantity) || 0;
  const lines = (group.items as Row[]).map((part, offset) => {
    const ownMaterial = String(part.material ?? '').trim() !== '';
    const quantity = Number(part.quantity) * rowQuantity;
    return {
      ...blankItem(index + offset + 1),
      drawing_no: part.drawing_no,
      material: ownMaterial ? part.material : row.material,
      thickness: ownMaterial ? part.thickness : row.thickness,
      outsource: row.outsource,
      order_quantity: quantity ? String(Number(quantity.toFixed(4))) : '',
      order_no: row.order_no ?? '',
    };
  });
  current.value.items = replaceTransactionLine(
    current.value.items,
    index,
    lines,
  );
  lineChanged();
  await fillCncOk(current.value.items);
}

// 列印 P previews the saved document.
// What the shown record looked like when loaded: 列印 P refuses a changed
// form, as the legacy one does.
let savedForm = '';

async function printDocument() {
  if (selectedKey.value == null || mode.value === 'new') return;
  if (JSON.stringify(current.value) !== savedForm) {
    window.alert('內容已變動，請先執行更新再繼續');
    return;
  }
  errorMessage.value = '';
  try {
    printState.value = await buildDocumentPrint(
      'document',
      'work',
      selectedKey.value,
    );
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

// F1 輔助輸入 on each field, as the legacy 工作登錄 does it. A user with
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

function assistOrder() {
  assistEdit('open-order', {
    prefix: current.value.order_no,
    customer: current.value.customer_code,
    columns: BRIEF_ORDER_COLUMNS,
    onSelect: (order) => {
      // A new work sheet takes the order's lines too.
      if (mode.value === 'new') importOrders([order]);
      else {
        current.value.order_no = order.order_no;
        current.value.customer_code = order.customer_code;
        current.value.customer_name = order.customer_name;
      }
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
      @print="printDocument"
      @add="addWork"
      @edit="editWork"
      @cancel="cancelEdit"
      @save="saveWork"
      @delete="deleteWork"
      @query="openQuery"
      @previous="navigate('previous')"
      @next="navigate('next')"
      @first="navigate('first')"
      @last="navigate('last')"
      @close="closeWindow"
    />

    <form class="legacy-form-fields" @submit.prevent>
      <div class="legacy-form-column">
        <label class="legacy-form-field"
          ><span>工作編號</span
          ><input
            v-model="current.work_no"
            :data-hint="FORM_HINT"
            maxlength="10"
            @keydown.enter.prevent="lookupNumber"
            @keydown.f1.prevent="openQuery"
        /></label>
        <label class="legacy-form-field"
          ><span>轉單日期</span
          ><input
            v-model="current.transfer_date"
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
            v-model="current.order_no"
            :data-hint="ASSIST_HINT"
            v-bind="lock"
            maxlength="10"
            @change="syncOrder"
            @keydown.f1.prevent="assistOrder"
        /></label>
      </div>
    </form>

    <div class="legacy-grid" style="max-height: 372px">
      <table>
        <colgroup>
          <col style="width: 40px" />
          <col style="width: 89px" />
          <col style="width: 89px" />
          <col style="width: 56px" />
          <col style="width: 56px" />
          <col style="width: 89px" />
          <col style="width: 89px" />
          <col style="width: 89px" />
          <col style="width: 89px" />
          <col style="width: 289px" />
        </colgroup>
        <thead>
          <tr>
            <th>項次</th>
            <th>電腦圖號</th>
            <th>材　質</th>
            <th>厚度</th>
            <th>代料</th>
            <th>訂單數</th>
            <th>完工數</th>
            <th>CNC_OK</th>
            <th>雷射工件</th>
            <th>後　加　工</th>
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
                :data-hint="LINE_HINTS.work"
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
                v-model="item.order_quantity"
                class="num"
                inputmode="decimal"
                v-bind="lock"
                :aria-label="`第 ${index + 1} 列訂單數`"
                @input="lineChanged"
              />
            </td>
            <td>
              <input
                v-model="item.completed_quantity"
                class="num"
                inputmode="decimal"
                v-bind="lock"
                :aria-label="`第 ${index + 1} 列完工數`"
                @input="lineChanged"
              />
            </td>
            <td>
              <input
                :value="item.cnc_ok"
                readonly
                tabindex="-1"
                :disabled="!isEditable"
                :aria-label="`第 ${index + 1} 列 CNC_OK`"
              />
            </td>
            <td>
              <input
                v-model="item.plating_work"
                v-bind="lock"
                maxlength="20"
                :aria-label="`第 ${index + 1} 列雷射工件`"
                @input="lineChanged"
              />
            </td>
            <td>
              <input
                v-model="item.post_process"
                v-bind="lock"
                maxlength="20"
                :aria-label="`第 ${index + 1} 列後加工`"
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
      title="工作登錄查詢"
      :columns="[
        { key: 'number', label: '工作編號' },
        { key: 'party', label: '客戶' },
        { key: 'actor', label: '經手人' },
        { key: 'date', label: '轉單日期', align: 'right' },
      ]"
      :rows="queryState.rows"
      :loading="queryState.loading"
      :error="queryState.error"
      :truncated="queryState.truncated"
      @select="chooseQuery"
      @cancel="queryState = null"
    />
    <LegacyAssistHost :assist="assist" />
    <LegacyOrderToWorkWindow
      v-if="convertingOrders"
      :today="todayLegacyDate()"
      @confirm="confirmConversion"
      @cancel="convertingOrders = false"
    />
    <LegacyDocumentPrint
      v-if="printState"
      :label="printState.label"
      :pages="printState.pages"
      :log="printState.log"
      @close="printState = null"
    />
    <LegacyDrawingWindow
      v-if="drawingFor"
      :drawing-no="drawingFor"
      :customer-code="current.customer_code"
      @close="drawingFor = null"
    />
  </section>
</template>
