<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import LegacyAssistHost from './LegacyAssistHost.vue';
import LegacyQueryWindow from './LegacyQueryWindow.vue';
import LegacyRecordToolbar from './LegacyRecordToolbar.vue';
import { legacyGet, legacySend, queryString } from '../services/legacyApi';
import { useLegacyFieldLock, useLegacyReadOnly } from '../utils/legacyAccess';
import {
  ASSIST_CYCLES,
  nextCycleValue,
  useLegacyAssist,
  type AssistOpenOptions,
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
  RESERVED_MARK,
  allocateReceipt,
  isReserved,
} from '../utils/receiptAllocation';
import {
  ensureTrailingBlankLine,
  padTransactionLines,
} from '../utils/transactionLines';
import {
  ASSIST_HINT,
  FORM_HINT,
  LINE_HINTS,
  PHRASE_HINT,
  RECEIPT_NUMBER_HINT,
  RECEIPT_RESERVE_HINT,
} from '../utils/statusHints';

// 收款登錄 (isin_vb6 src/components/ReceiptsView.vue). A user with `crm` read
// only can browse and query; the fields and 保留 cannot be changed
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
const banks = ref<Row[]>([]);
const selectedKey = ref<string | null>(null);
const current = ref<Row>(blankReceipt());
const mode = ref('view');
useNewDocumentNumber('receipts', current, mode, 'receipt_no', 'receipt_date');
const queryState = ref<QueryState | null>(null);
const closeWindow = useCloseWindow();
const assist = useLegacyAssist();
const errorMessage = ref('');
const statusMessage = ref('');
const readOnly = useLegacyReadOnly();
const isEditable = computed(
  () => !readOnly.value && (mode.value === 'new' || mode.value === 'edit'),
);
const lock = useLegacyFieldLock(isEditable, mode);
// The legacy form lets 金額, 折讓, 沖銷 and 保留 be entered only on a new
// receipt; a saved one keeps what it settled.
const isNew = computed(() => mode.value === 'new');

const summaries = [
  { key: 'current_received', label: '本期實收' },
  { key: 'current_merchandise', label: '本期貨款' },
  { key: 'current_tax', label: '本期稅額' },
  { key: 'current_discount', label: '本期折讓' },
  { key: 'previous_advance', label: '前期預收' },
  { key: 'previous_unpaid', label: '前期未收' },
  { key: 'current_advance', label: '本期預收' },
  { key: 'current_unpaid', label: '本期未收' },
];

function todayLegacyDate() {
  const today = new Date();
  const year = today.getFullYear() - 1911;
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

function blankPayment(lineNo: number): Row & { line_no: number } {
  return {
    line_no: lineNo,
    category: '',
    amount: '',
    check_number: '',
    check_date: '',
    bank_account: '',
    collect_agent: '',
    bank_short_name: '',
    note: '',
  };
}

function blankAllocation(lineNo: number): Row & { line_no: number } {
  return {
    line_no: lineNo,
    sale_no: '',
    merchandise: '',
    tax: '',
    discount: '',
    receivable: '',
    unpaid: '',
    offset: '',
    reserved: '',
  };
}

function blankReceipt(): Row {
  return {
    receipt_no: '',
    receipt_date: todayLegacyDate(),
    closing_date: todayLegacyDate(),
    customer_code: '',
    customer_name: '',
    actor_no: '',
    actor_name: 'MASTER',
    current_received: '',
    current_merchandise: '',
    current_tax: '',
    current_discount: '',
    previous_advance: '',
    previous_unpaid: '',
    current_advance: '',
    current_unpaid: '',
    payments: Array.from({ length: 2 }, (_, index) => blankPayment(index + 1)),
    allocations: Array.from({ length: 10 }, (_, index) =>
      blankAllocation(index + 1),
    ),
  };
}

function recordKey(receipt: Row | null | undefined): string | null {
  return receipt?.receipt_no ?? null;
}

function paymentHasData(line: Row) {
  return (
    [
      'category',
      'check_number',
      'check_date',
      'bank_account',
      'collect_agent',
      'bank_short_name',
      'note',
    ].some((field) => String(line[field] ?? '').trim() !== '') ||
    (line.amount != null && String(line.amount).trim() !== '')
  );
}

function allocationHasData(line: Row) {
  return (
    String(line.sale_no ?? '').trim() !== '' ||
    [
      'merchandise',
      'tax',
      'discount',
      'receivable',
      'unpaid',
      'offset',
      'previously_offset',
    ].some((field) => line[field] != null && String(line[field]).trim() !== '')
  );
}

// Legacy dcrf only keeps sales that were actually offset, so listed sales
// left without an offset are not saved.
function allocationIsOffset(line: Row) {
  return (
    String(line.sale_no ?? '').trim() === '' || Number(line.offset || 0) !== 0
  );
}

// 保留 only steers the offsets on screen; the legacy program does not keep it.
function receiptForSave(receipt: Row) {
  return {
    ...receipt,
    payments: (receipt.payments as Row[]).filter(paymentHasData),
    allocations: (receipt.allocations as Row[])
      .filter(allocationHasData)
      .filter(allocationIsOffset)
      .map((line) => ({ ...line, reserved: '' })),
  };
}

function withVisibleRows(receipt: Row): Row {
  const payments = padTransactionLines(
    ((receipt.payments ?? []) as Row[]).map((line) => ({
      ...blankPayment(line.line_no),
      ...line,
    })),
    2,
    blankPayment,
  );
  const allocations = padTransactionLines(
    ((receipt.allocations ?? []) as Row[]).map((line) => ({
      ...blankAllocation(line.line_no),
      ...line,
    })),
    10,
    blankAllocation,
  );
  return { ...blankReceipt(), ...receipt, payments, allocations };
}

function selectReceipt(receipt: Row) {
  selectedKey.value = recordKey(receipt);
  current.value = withVisibleRows(receipt);
  mode.value = 'edit';
  errorMessage.value = '';
  statusMessage.value = '';
}

async function openReceipt(receiptNo: string) {
  try {
    const payload = await legacyGet<{ item: Row }>(
      `/receipts/${encodeURIComponent(receiptNo)}`,
    );
    selectReceipt(payload.item);
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

async function loadLookups() {
  const [customerResult, bankResult] = await Promise.allSettled([
    legacyGet<{ items: Row[] }>('/partners?kind=customer'),
    legacyGet<{ items: Row[] }>('/banks'),
  ]);
  if (customerResult.status === 'fulfilled')
    customers.value = customerResult.value.items;
  if (bankResult.status === 'fulfilled') banks.value = bankResult.value.items;
}

function addReceipt() {
  selectedKey.value = null;
  current.value = blankReceipt();
  mode.value = 'new';
  errorMessage.value = '';
  statusMessage.value = '';
}

// 更新 F6 saves the record as changed on the form, after the legacy
// 「確定修改這筆資料？」.
async function editReceipt() {
  if (selectedKey.value == null || mode.value !== 'edit') return;
  if (!window.confirm('確定修改這筆資料？')) return;
  await saveReceipt();
}

async function cancelEdit() {
  if (mode.value === 'new') {
    selectedKey.value = null;
    current.value = blankReceipt();
    mode.value = 'view';
  } else if (selectedKey.value != null) await openReceipt(selectedKey.value);
  errorMessage.value = '';
  statusMessage.value = '';
}

async function saveReceipt() {
  if (readOnly.value) return;
  errorMessage.value = '';
  statusMessage.value = '';
  const adding = mode.value === 'new';
  const receipt = receiptForSave(current.value);
  const path = adding
    ? '/receipts'
    : `/receipts/${encodeURIComponent(selectedKey.value ?? '')}`;
  try {
    const payload = await legacySend<{ item: Row }>(
      path,
      adding ? 'POST' : 'PUT',
      receipt,
    );
    selectReceipt(payload.item);
    statusMessage.value = '存檔完成';
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

async function deleteReceipt() {
  if (selectedKey.value == null || readOnly.value) return;
  if (!window.confirm('確定刪除這筆資料？')) return;
  const deletedKey = selectedKey.value;
  try {
    // The record to show next, found while the deleted one is still on file.
    const neighbour = await neighbourDocument('receipts', deletedKey);
    await legacySend(`/receipts/${encodeURIComponent(deletedKey)}`, 'DELETE');
    selectedKey.value = null;
    current.value = blankReceipt();
    mode.value = 'view';
    if (neighbour) await openReceipt(neighbour);
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
  void loadOpenSales();
}

function reallocate() {
  const result = allocateReceipt({
    allocations: current.value.allocations as Row[],
    previousAdvance: current.value.previous_advance,
    received: current.value.current_received,
    previousUnpaid: current.value.previous_unpaid,
  });
  current.value.allocations = result.allocations;
  Object.assign(current.value, result.totals);
}

function handleSummaryInput(key: string) {
  if (
    key === 'current_received' ||
    key === 'previous_advance' ||
    key === 'previous_unpaid'
  )
    reallocate();
}

// Like the legacy form, a new receipt lists the customer's unpaid sales up to
// the closing date and carries over the previous receipt's advance.
async function loadOpenSales() {
  const customerCode = String(current.value.customer_code ?? '').trim();
  if (mode.value !== 'new' || !customerCode) return;
  const params = new URLSearchParams({
    customer_code: customerCode,
    closing_date: current.value.closing_date,
  });
  try {
    const payload = await legacyGet<{
      previous_advance: unknown;
      allocations: Row[];
    }>(`/receipt-candidates${queryString(params)}`);
    if (
      mode.value !== 'new' ||
      String(current.value.customer_code ?? '').trim() !== customerCode
    )
      return;
    current.value.previous_advance = payload.previous_advance || '';
    current.value.allocations = padTransactionLines(
      payload.allocations.map((line, index) => ({
        ...blankAllocation(index + 1),
        ...line,
        discount: line.discount || '',
      })),
      10,
      blankAllocation,
    );
    reallocate();
    errorMessage.value = '';
    statusMessage.value = payload.allocations.length
      ? `已帶出 ${payload.allocations.length} 筆未收銷貨`
      : '此客戶在帳款結日前沒有未收銷貨';
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

// Any key on 保留 switches it between ＊ and blank, as on Win7: 「當此欄內容為＊時，此筆出貨不沖帳」.
function toggleReserved(line: Row, event: KeyboardEvent) {
  if (
    ['Tab', 'Shift', 'Escape'].includes(event.key) ||
    !String(line.sale_no ?? '').trim() ||
    !isEditable.value
  )
    return;
  event.preventDefault();
  line.reserved = isReserved(line) ? '' : RESERVED_MARK;
  reallocate();
}

function syncBank(payment: Row) {
  const bank = banks.value.find(
    (item) =>
      item.account_no === payment.bank_account ||
      item.code === payment.bank_account,
  );
  if (bank) payment.bank_short_name = bank.short_name;
}

// 頭筆／上筆／下筆／尾筆 step through 單據編號 in text order.
async function navigate(direction: BrowseDirection) {
  if (mode.value === 'new') return;
  errorMessage.value = '';
  try {
    const number = await navigateDocument(
      'receipts',
      direction,
      selectedKey.value ?? '',
    );
    if (number) await openReceipt(number);
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
    const payload = await queryDocuments('receipts', {
      number: current.value.receipt_no,
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
  await openReceipt(row.number);
}

// Typing a complete number and pressing Enter shows that document.
async function lookupNumber() {
  if (mode.value === 'new' || !current.value.receipt_no.trim()) return;
  await openReceipt(current.value.receipt_no.trim());
}

function paymentChanged() {
  if (isEditable.value)
    current.value.payments = ensureTrailingBlankLine(
      current.value.payments,
      paymentHasData,
      blankPayment,
    );
}

// 分類 in the payment grid:「F3在此插入空白,F4刪除此項(須再執行增加或修改才生效)」.
// Only that column takes the keys in the legacy form (FAcG Text2).
function paymentKey(event: KeyboardEvent) {
  if (!isEditable.value) return;
  const payments = lineKeyItems(event, current.value.payments, {
    blank: blankPayment,
    minimum: 2,
  });
  if (payments) {
    current.value.payments = payments;
    paymentChanged();
  }
}

// F1 輔助輸入 on each field, as the legacy 收款登錄 does it. A user with
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

function assistBank(line: Row) {
  assistEdit('bank', {
    onSelect: (row) => {
      line.bank_account = row.account;
      line.bank_short_name = row.short_name ?? '';
      paymentChanged();
    },
  });
}

function cycleCategory(line: Row) {
  if (!isEditable.value) return;
  line.category = nextCycleValue(ASSIST_CYCLES.payment, line.category);
  paymentChanged();
}

function assistPhrase(line: Row) {
  if (!isEditable.value) return;
  assist.phrase((content) => {
    line.note = `${line.note ?? ''}${content}`;
    paymentChanged();
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
      :print="false"
      @add="addReceipt"
      @edit="editReceipt"
      @cancel="cancelEdit"
      @save="saveReceipt"
      @delete="deleteReceipt"
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
          ><span>單據編號</span
          ><input
            v-model="current.receipt_no"
            :data-hint="FORM_HINT"
            maxlength="10"
            @keydown.enter.prevent="lookupNumber"
            @keydown.f1.prevent="openQuery"
        /></label>
        <label class="legacy-form-field"
          ><span>收款日期</span
          ><input
            v-model="current.receipt_date"
            class="num"
            v-bind="lock"
            maxlength="10"
        /></label>
        <label class="legacy-form-field"
          ><span>帳款訖日</span
          ><input
            v-model="current.closing_date"
            class="num"
            v-bind="lock"
            maxlength="10"
            @change="loadOpenSales"
        /></label>
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
      <div class="legacy-form-column legacy-form-column-offset">
        <label
          v-for="field in summaries.slice(0, 4)"
          :key="field.key"
          class="legacy-form-field"
          ><span>{{ field.label }}</span
          ><input
            v-model="current[field.key]"
            class="num"
            inputmode="decimal"
            v-bind="lock"
            @input="handleSummaryInput(field.key)"
        /></label>
      </div>
      <div class="legacy-form-column legacy-form-column-offset">
        <label
          v-for="field in summaries.slice(4)"
          :key="field.key"
          class="legacy-form-field"
          ><span>{{ field.label }}</span
          ><input
            v-model="current[field.key]"
            class="num"
            :class="{ 'readonly-value': field.key === 'current_unpaid' }"
            inputmode="decimal"
            v-bind="lock"
            @input="handleSummaryInput(field.key)"
        /></label>
      </div>
    </form>

    <div class="legacy-grid" style="max-height: 70px">
      <table>
        <colgroup>
          <col style="width: 40px" />
          <col style="width: 46px" />
          <col style="width: 89px" />
          <col style="width: 119px" />
          <col style="width: 89px" />
          <col style="width: 132px" />
          <col style="width: 39px" />
          <col style="width: 89px" />
          <col style="width: 112px" />
        </colgroup>
        <thead>
          <tr>
            <th>項次</th>
            <th>分類</th>
            <th>金　額</th>
            <th>支票號碼</th>
            <th>支票日期</th>
            <th>銀行帳號</th>
            <th>代收</th>
            <th>銀行簡稱</th>
            <th>備　註</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(line, index) in current.payments"
            :key="line.line_no"
            :data-index="index"
          >
            <td class="line-no">{{ index + 1 }}</td>
            <td>
              <input
                v-model="line.category"
                :data-hint="LINE_HINTS.receiptPayments"
                v-bind="lock"
                maxlength="10"
                :aria-label="`第 ${index + 1} 列收款分類`"
                @input="paymentChanged"
                @keydown.f1.prevent="cycleCategory(line)"
                @keydown="paymentKey"
              />
            </td>
            <td>
              <input
                v-model="line.amount"
                class="num"
                inputmode="decimal"
                :disabled="!isNew"
                :aria-label="`第 ${index + 1} 列收款金額`"
                @input="paymentChanged"
              />
            </td>
            <td>
              <input
                v-model="line.check_number"
                v-bind="lock"
                maxlength="30"
                :aria-label="`第 ${index + 1} 列支票號碼`"
                @input="paymentChanged"
              />
            </td>
            <td>
              <input
                v-model="line.check_date"
                v-bind="lock"
                maxlength="10"
                :aria-label="`第 ${index + 1} 列支票日期`"
                @input="paymentChanged"
              />
            </td>
            <td>
              <input
                v-model="line.bank_account"
                :data-hint="PHRASE_HINT"
                v-bind="lock"
                maxlength="30"
                :aria-label="`第 ${index + 1} 列銀行帳號`"
                @change="
                  syncBank(line);
                  paymentChanged();
                "
                @keydown.f1.prevent="assistBank(line)"
              />
            </td>
            <td>
              <input
                v-model="line.collect_agent"
                :data-hint="RECEIPT_NUMBER_HINT"
                v-bind="lock"
                maxlength="20"
                :aria-label="`第 ${index + 1} 列代收`"
                @input="paymentChanged"
              />
            </td>
            <td>
              <input
                v-model="line.bank_short_name"
                v-bind="lock"
                maxlength="20"
                :aria-label="`第 ${index + 1} 列銀行簡稱`"
                @input="paymentChanged"
              />
            </td>
            <td>
              <input
                v-model="line.note"
                :data-hint="PHRASE_HINT"
                v-bind="lock"
                maxlength="40"
                :aria-label="`第 ${index + 1} 列備註`"
                @input="paymentChanged"
                @keydown.f10.prevent="assistPhrase(line)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="legacy-grid" style="max-height: 254px">
      <table>
        <colgroup>
          <col style="width: 40px" />
          <col style="width: 96px" />
          <col style="width: 96px" />
          <col style="width: 96px" />
          <col style="width: 96px" />
          <col style="width: 96px" />
          <col style="width: 96px" />
          <col style="width: 96px" />
          <col style="width: 46px" />
        </colgroup>
        <thead>
          <tr>
            <th>項次</th>
            <th>出貨編號</th>
            <th>貨款</th>
            <th>營業稅</th>
            <th>折讓金額</th>
            <th>應收金額</th>
            <th>未收金額</th>
            <th>沖銷金額</th>
            <th>保留</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, index) in current.allocations" :key="line.line_no">
            <td class="line-no">{{ index + 1 }}</td>
            <td>
              <input
                v-model="line.sale_no"
                class="num readonly-value"
                v-bind="lock"
                maxlength="10"
                :aria-label="`第 ${index + 1} 列出貨編號`"
              />
            </td>
            <td>
              <input
                v-model="line.merchandise"
                class="num readonly-value"
                inputmode="decimal"
                v-bind="lock"
                :aria-label="`第 ${index + 1} 列貨款`"
              />
            </td>
            <td>
              <input
                v-model="line.tax"
                class="num readonly-value"
                inputmode="decimal"
                v-bind="lock"
                :aria-label="`第 ${index + 1} 列營業稅`"
              />
            </td>
            <td>
              <input
                v-model="line.discount"
                class="num readonly-value"
                inputmode="decimal"
                :disabled="!isNew"
                :aria-label="`第 ${index + 1} 列折讓金額`"
                @input="reallocate"
              />
            </td>
            <td>
              <input
                v-model="line.receivable"
                class="num readonly-value"
                inputmode="decimal"
                v-bind="lock"
                :aria-label="`第 ${index + 1} 列應收金額`"
              />
            </td>
            <td>
              <input
                v-model="line.unpaid"
                class="num readonly-value"
                inputmode="decimal"
                v-bind="lock"
                :aria-label="`第 ${index + 1} 列未收金額`"
              />
            </td>
            <td>
              <input
                v-model="line.offset"
                class="num readonly-value"
                inputmode="decimal"
                :disabled="!isNew"
                :aria-label="`第 ${index + 1} 列沖銷金額`"
              />
            </td>
            <td>
              <input
                :value="isReserved(line) ? RESERVED_MARK : ''"
                :data-hint="RECEIPT_RESERVE_HINT"
                class="readonly-value"
                readonly
                :disabled="!isNew"
                :aria-label="`第 ${index + 1} 列保留`"
                @keydown="toggleReserved(line, $event)"
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
      title="收款登錄查詢"
      :columns="[
        { key: 'number', label: '單據編號' },
        { key: 'party', label: '客戶' },
        { key: 'actor', label: '經手人' },
        { key: 'date', label: '收款日期', align: 'right' },
      ]"
      :rows="queryState.rows"
      :loading="queryState.loading"
      :error="queryState.error"
      :truncated="queryState.truncated"
      @select="chooseQuery"
      @cancel="queryState = null"
    />
    <LegacyAssistHost :assist="assist" />
  </section>
</template>
