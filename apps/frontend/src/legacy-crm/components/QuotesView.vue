<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import LegacyAssistHost from './LegacyAssistHost.vue';
import LegacyQueryWindow from './LegacyQueryWindow.vue';
import LegacyDocumentPrint from './LegacyDocumentPrint.vue';
import LegacyRecordToolbar from './LegacyRecordToolbar.vue';
import LegacySelectionWindow from './LegacySelectionWindow.vue';
import { legacyGet, legacySend } from '../services/legacyApi';
import {
  buildDocumentPrint,
  type DocumentPrint,
} from '../utils/documentPrinting';
import { useLegacyFieldLock, useLegacyReadOnly } from '../utils/legacyAccess';
import {
  PART_MODEL_REQUIRED,
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
import {
  QUOTE_HISTORY_COLUMNS,
  QUOTE_HISTORY_HINT,
  loadQuoteHistory,
  placeQuoteRows,
} from '../utils/quoteHistory';
import { useCloseWindow } from '../utils/legacyWindow';
import {
  ensureTrailingBlankLine,
  padTransactionLines,
} from '../utils/transactionLines';
import {
  ASSIST_HINT,
  FORM_HINT,
  LINE_HINTS,
  QUOTE_MATERIAL_HINT,
  QUOTE_PHRASE_HINT,
} from '../utils/statusHints';

// 報價登錄 (isin_vb6 src/components/QuotesView.vue). A user with `crm` read
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
const current = ref<Row>(blankQuote());
const mode = ref('view');
useNewDocumentNumber('quotes', current, mode, 'quote_no', 'quote_date');
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
const total = computed(() =>
  (current.value.items as Row[]).reduce(
    (sum, item) => sum + lineAmount(item),
    0,
  ),
);

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
    customer_model: '',
    material: '',
    thickness: '',
    summary: '',
    quantity: '',
    unit_price: '',
  };
}

function blankNote(lineNo: number): Row & { line_no: number } {
  return { line_no: lineNo, note: '' };
}

function blankQuote(): Row {
  return {
    quote_no: '',
    quote_date: todayLegacyDate(),
    customer_code: '',
    customer_name: '',
    actor_no: '',
    actor_name: 'MASTER',
    attention: '',
    legacy_xx: '',
    items: Array.from({ length: 10 }, (_, index) => blankItem(index + 1)),
    notes: Array.from({ length: 5 }, (_, index) => blankNote(index + 1)),
  };
}

function numeric(value: unknown) {
  const amount = value == null || value === '' ? 0 : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function lineAmount(item: Row) {
  return (
    Math.round(numeric(item.quantity) * numeric(item.unit_price) * 10000) /
    10000
  );
}

function formatAmount(value: unknown) {
  return numeric(value).toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function recordKey(quote: Row | null | undefined): string | null {
  return quote?.quote_no ?? null;
}

function itemHasData(item: Row) {
  return (
    ['customer_model', 'material', 'thickness', 'summary'].some(
      (field) => String(item[field] ?? '').trim() !== '',
    ) ||
    ['quantity', 'unit_price'].some(
      (field) => item[field] != null && String(item[field]).trim() !== '',
    )
  );
}

function quoteForSave(quote: Row) {
  return {
    ...quote,
    items: (quote.items as Row[]).filter(itemHasData),
    notes: (quote.notes as Row[]).filter(
      (item) => String(item.note ?? '').trim() !== '',
    ),
  };
}

function withVisibleRows(quote: Row): Row {
  const items = padTransactionLines(
    ((quote.items ?? []) as Row[]).map((item) => ({
      ...blankItem(item.line_no),
      ...item,
    })),
    10,
    blankItem,
  );
  const notes = padTransactionLines(
    ((quote.notes ?? []) as Row[]).map((item) => ({
      ...blankNote(item.line_no),
      ...item,
      note: item.note ?? '',
    })),
    5,
    blankNote,
  );
  return { ...blankQuote(), ...quote, items, notes };
}

function selectQuote(quote: Row) {
  selectedKey.value = recordKey(quote);
  current.value = withVisibleRows(quote);
  mode.value = 'edit';
  savedForm = JSON.stringify(current.value);
  errorMessage.value = '';
  statusMessage.value = '';
}

async function openQuote(quoteNo: string) {
  try {
    const payload = await legacyGet<{ item: Row }>(
      '/quotes/' + encodeURIComponent(quoteNo),
    );
    selectQuote(payload.item);
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

function addQuote() {
  selectedKey.value = null;
  current.value = blankQuote();
  mode.value = 'new';
  errorMessage.value = '';
  statusMessage.value = '';
}

// 更新 F6 saves the record as changed on the form, after the legacy
// 「確定修改這筆資料？」.
async function editQuote() {
  if (selectedKey.value == null || mode.value !== 'edit') return;
  if (!window.confirm('確定修改這筆資料？')) return;
  await saveQuote();
}

async function cancelEdit() {
  if (mode.value === 'new') {
    selectedKey.value = null;
    current.value = blankQuote();
    mode.value = 'view';
  } else if (selectedKey.value != null) await openQuote(selectedKey.value);
  errorMessage.value = '';
  statusMessage.value = '';
}

async function saveQuote() {
  if (readOnly.value) return;
  errorMessage.value = '';
  statusMessage.value = '';
  const isNew = mode.value === 'new';
  const quote = quoteForSave(current.value);
  const path = isNew
    ? '/quotes'
    : '/quotes/' + encodeURIComponent(selectedKey.value ?? '');
  try {
    const payload = await legacySend<{ item: Row }>(
      path,
      isNew ? 'POST' : 'PUT',
      quote,
    );
    selectQuote(payload.item);
    statusMessage.value = '存檔完成';
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

async function deleteQuote() {
  if (selectedKey.value == null || readOnly.value) return;
  if (!window.confirm('確定刪除這筆資料？')) return;
  const deletedKey = selectedKey.value;
  try {
    // The record to show next, found while the deleted one is still on file.
    const neighbour = await neighbourDocument('quotes', deletedKey);
    await legacySend('/quotes/' + encodeURIComponent(deletedKey), 'DELETE');
    selectedKey.value = null;
    current.value = blankQuote();
    mode.value = 'view';
    if (neighbour) await openQuote(neighbour);
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

function syncPart(item: Row) {
  const part = parts.value.find(
    (entry) => entry.customer_model === item.customer_model,
  );
  if (!part) return;
  item.material ||= part.material;
  item.thickness ||= part.thickness;
}

// 頭筆／上筆／下筆／尾筆 step through 報價編號 in text order.
async function navigate(direction: BrowseDirection) {
  if (mode.value === 'new') return;
  errorMessage.value = '';
  try {
    const number = await navigateDocument(
      'quotes',
      direction,
      selectedKey.value ?? '',
    );
    if (number) await openQuote(number);
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
    const payload = await queryDocuments('quotes', {
      number: current.value.quote_no,
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
  await openQuote(row.number);
}

// Typing a complete number and pressing Enter shows that document.
async function lookupNumber() {
  if (mode.value === 'new' || !current.value.quote_no.trim()) return;
  await openQuote(current.value.quote_no.trim());
}

function lineChanged() {
  if (isEditable.value)
    current.value.items = ensureTrailingBlankLine(
      current.value.items,
      itemHasData,
      blankItem,
    );
}

function noteChanged() {
  if (isEditable.value)
    current.value.notes = ensureTrailingBlankLine(
      current.value.notes,
      (item: Row) => String(item.note ?? '').trim() !== '',
      blankNote,
    );
}

// Detail keys (Win7):「F3插入一筆空白，F4刪除此筆，F8查報價記錄」; the notes
// grid has F3／F4 only. F8 is the 訂單登錄 window; the rows chosen replace the
// grid from the cursor down with 客戶型號, 材質, 厚度, 摘要, 數量 and 單價
// (2026-10-08), and 小計 follows.
const quotePicker = ref<PickerState | null>(null);
function lineKey(event: KeyboardEvent) {
  if (!isEditable.value) return;
  const items = lineKeyItems(event, current.value.items, {
    blank: blankItem,
    minimum: 10,
    actions: { F8: openQuoteHistory },
  });
  if (items) {
    current.value.items = items;
    lineChanged();
  }
}

async function openQuoteHistory(index: number) {
  const customer = String(current.value.customer_code ?? '').trim();
  if (!customer) return;
  quotePicker.value = { index, rows: [], loading: true, error: '' };
  try {
    const rows = await loadQuoteHistory(customer);
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
    blankItem,
    (line, row) => ({
      ...line,
      customer_model: row.customer_model,
      material: row.material,
      thickness: row.thickness,
      summary: row.summary,
      quantity: String(Number(row.quantity)),
      unit_price: String(Number(row.unit_price)),
    }),
  );
  lineChanged();
}
function noteKey(event: KeyboardEvent) {
  if (!isEditable.value) return;
  const notes = lineKeyItems(event, current.value.notes, {
    blank: blankNote,
    minimum: 5,
  });
  if (notes) {
    current.value.notes = notes;
    noteChanged();
  }
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
      'quote',
      selectedKey.value,
    );
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

// F1 輔助輸入 on each field, as the legacy 報價登錄 does it. A user with
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

// 客戶型號 looks parts up by the model's first characters.
function assistModel(item: Row) {
  if (!String(item.customer_model ?? '').trim()) {
    window.alert(PART_MODEL_REQUIRED);
    return;
  }
  assistEdit('part-model', {
    prefix: item.customer_model,
    onSelect: (row) => {
      item.customer_model = row.customer_model;
      item.material = row.material;
      item.thickness = row.thickness;
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

function assistPhrase(item: Row) {
  if (!isEditable.value) return;
  assist.phrase((content) => {
    item.summary = `${item.summary ?? ''}${content}`;
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
      @print="printDocument"
      @add="addQuote"
      @edit="editQuote"
      @cancel="cancelEdit"
      @save="saveQuote"
      @delete="deleteQuote"
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
          ><span>報價編號</span
          ><input
            v-model="current.quote_no"
            :data-hint="FORM_HINT"
            maxlength="10"
            @keydown.enter.prevent="lookupNumber"
            @keydown.f1.prevent="openQuery"
        /></label>
        <label class="legacy-form-field"
          ><span>報價日期</span
          ><input
            v-model="current.quote_date"
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
          ><span>ATTENTION</span
          ><input
            v-model="current.attention"
            class="wide"
            v-bind="lock"
            maxlength="40"
        /></label>
        <label class="legacy-form-field"
          ><span>金額合計</span
          ><input
            class="num"
            :value="total ? formatAmount(total) : ''"
            disabled
        /></label>
      </div>
    </form>

    <div class="legacy-grid" style="max-height: 254px">
      <table>
        <colgroup>
          <col style="width: 40px" />
          <col style="width: 202px" />
          <col style="width: 89px" />
          <col style="width: 89px" />
          <col style="width: 286px" />
          <col style="width: 89px" />
          <col style="width: 89px" />
          <col style="width: 91px" />
        </colgroup>
        <thead>
          <tr>
            <th>項次</th>
            <th>客戶型號</th>
            <th>材質</th>
            <th>厚度</th>
            <th>摘要</th>
            <th>數　量</th>
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
                v-model="item.customer_model"
                :data-hint="LINE_HINTS.quotes"
                v-bind="lock"
                maxlength="40"
                :aria-label="`第 ${index + 1} 列客戶型號`"
                @change="
                  syncPart(item);
                  lineChanged();
                "
                @keydown.f1.prevent="assistModel(item)"
              />
            </td>
            <td>
              <input
                v-model="item.material"
                :data-hint="QUOTE_MATERIAL_HINT"
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
                v-model="item.summary"
                :data-hint="QUOTE_PHRASE_HINT"
                v-bind="lock"
                maxlength="250"
                :aria-label="`第 ${index + 1} 列摘要`"
                @input="lineChanged"
                @keydown.f10.prevent="assistPhrase(item)"
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
                v-model="item.unit_price"
                class="num"
                inputmode="decimal"
                v-bind="lock"
                :aria-label="`第 ${index + 1} 列單價`"
                @input="lineChanged"
              />
            </td>
            <td>
              <input
                class="num"
                :value="itemHasData(item) ? formatAmount(lineAmount(item)) : ''"
                disabled
                :aria-label="`第 ${index + 1} 列小計`"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="legacy-grid" style="max-height: 140px">
      <table>
        <colgroup>
          <col style="width: 40px" />
          <col style="width: 935px" />
        </colgroup>
        <thead>
          <tr>
            <th>列次</th>
            <th>備　　　註　　　內　　　容</th>
          </tr>
        </thead>
        <tbody @keydown="noteKey">
          <tr
            v-for="(item, index) in current.notes"
            :key="item.line_no"
            :data-index="index"
          >
            <td class="line-no">{{ index + 1 }}</td>
            <td>
              <input
                v-model="item.note"
                :data-hint="LINE_HINTS.quoteNotes"
                v-bind="lock"
                maxlength="250"
                :aria-label="`第 ${index + 1} 列備註內容`"
                @input="noteChanged"
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
      title="報價登錄查詢"
      :columns="[
        { key: 'number', label: '報價編號' },
        { key: 'party', label: '客戶' },
        { key: 'actor', label: '經手人' },
        { key: 'date', label: '報價日期', align: 'right' },
      ]"
      :rows="queryState.rows"
      :loading="queryState.loading"
      :error="queryState.error"
      :truncated="queryState.truncated"
      @select="chooseQuery"
      @cancel="queryState = null"
    />

    <LegacyAssistHost :assist="assist" />
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
    <LegacyDocumentPrint
      v-if="printState"
      :label="printState.label"
      :pages="printState.pages"
      :log="printState.log"
      @close="printState = null"
    />
  </section>
</template>
