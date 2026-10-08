<script setup lang="ts">
import { computed, ref } from 'vue';
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
  fetchAssistRows,
  useLegacyAssist,
  type AssistRow,
} from '../utils/legacyAssist';
import {
  navigateDocument,
  neighbourDocument,
  queryDocuments,
  type BrowseDirection,
} from '../utils/legacyBrowse';
import { lineKeyItems } from '../utils/lineKeys';
import { useCloseWindow } from '../utils/legacyWindow';
import { ensureTrailingBlankLine } from '../utils/transactionLines';
import { FORM_HINT, LINE_HINTS, PHRASE_HINT } from '../utils/statusHints';

// 圖組建檔 (isin_vb6 src/components/GroupsView.vue). A user with `crm` read
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

const selectedKey = ref<string | null>(null);
const current = ref<Row>(blankGroup());
const mode = ref('view');
const queryState = ref<QueryState | null>(null);
const printState = ref<DocumentPrint | null>(null);
const partPicker = ref<PickerState | null>(null);
const assist = useLegacyAssist();
const closeWindow = useCloseWindow();
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
  return `${year}.${month}.${day}`;
}

function blankItem(lineNo: number): Row & { line_no: string } {
  return {
    line_no: String(lineNo),
    drawing_no: '',
    customer_drawing_no: '',
    material: '',
    thickness: '',
    quantity: '',
    is_laser: '',
  };
}

function blankGroup(): Row {
  return {
    group_no: '',
    customer_code: '',
    customer_name: '',
    customer_drawing_no: '',
    created_date: todayLegacyDate(),
    notes: '',
    legacy_xx: '',
    items: Array.from({ length: 15 }, (_, index) => blankItem(index + 1)),
  };
}

function recordKey(group: Row | null | undefined): string | null {
  return group?.group_no ?? null;
}

function withVisibleRows(group: Row): Row {
  const items = ((group.items ?? []) as Row[]).map((item) => ({ ...item }));
  const count = Math.max(15, items.length);
  while (items.length < count) items.push(blankItem(items.length + 1));
  return { ...blankGroup(), ...group, items };
}

function selectGroup(group: Row) {
  selectedKey.value = recordKey(group);
  current.value = withVisibleRows(group);
  mode.value = 'edit';
  savedForm = JSON.stringify(current.value);
  errorMessage.value = '';
  statusMessage.value = '';
}

async function openGroup(groupNo: string) {
  try {
    const payload = await legacyGet<{ item: Row }>(
      `/groups/${encodeURIComponent(groupNo)}`,
    );
    selectGroup(payload.item);
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

function rowHasData(item: Row) {
  return [
    'drawing_no',
    'customer_drawing_no',
    'material',
    'thickness',
    'quantity',
    'is_laser',
  ].some((field) => String(item[field] ?? '').trim() !== '');
}

function blankLine(lineNo: number) {
  return blankItem(lineNo);
}

// The legacy 新增 leaves 建檔日期 blank as well (seen on Win7 2026-10-07).
function addGroup() {
  selectedKey.value = null;
  current.value = { ...blankGroup(), created_date: '' };
  mode.value = 'new';
  errorMessage.value = '';
  statusMessage.value = '';
}

// 更新 F6 saves the record as changed on the form, after the legacy
// 「確定修改這筆資料？」.
async function editGroup() {
  if (selectedKey.value == null || mode.value !== 'edit') return;
  if (!window.confirm('確定修改這筆資料？')) return;
  await saveGroup();
}

async function cancelEdit() {
  if (mode.value === 'new' || selectedKey.value == null) {
    selectedKey.value = null;
    current.value = blankGroup();
    mode.value = 'view';
  } else {
    await openGroup(selectedKey.value);
  }
  errorMessage.value = '';
  statusMessage.value = '';
}

async function saveGroup() {
  if (readOnly.value) return;
  errorMessage.value = '';
  statusMessage.value = '';
  const isNew = mode.value === 'new';
  const path = isNew
    ? '/groups'
    : `/groups/${encodeURIComponent(selectedKey.value ?? '')}`;
  try {
    const payload = await legacySend<{ item: Row }>(
      path,
      isNew ? 'POST' : 'PUT',
      current.value,
    );
    // A new group is followed by the next blank 新增, as on Win7.
    if (isNew) addGroup();
    else selectGroup(payload.item);
    statusMessage.value = '存檔完成';
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

async function deleteGroup() {
  if (selectedKey.value == null || readOnly.value) return;
  if (!window.confirm('確定刪除這筆資料？')) return;
  const deletedKey = selectedKey.value;
  try {
    // The record to show next, found while the deleted one is still on file.
    const neighbour = await neighbourDocument('groups', deletedKey);
    await legacySend(`/groups/${encodeURIComponent(deletedKey)}`, 'DELETE');
    selectedKey.value = null;
    current.value = blankGroup();
    mode.value = 'view';
    if (neighbour) await openGroup(neighbour);
    statusMessage.value = '已刪除';
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

// 頭筆／上筆／下筆／尾筆 step through 圖組編號 in text order.
async function navigate(direction: BrowseDirection) {
  if (mode.value === 'new') return;
  errorMessage.value = '';
  try {
    const number = await navigateDocument(
      'groups',
      direction,
      selectedKey.value ?? '',
    );
    if (number) await openGroup(number);
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
    const payload = await queryDocuments('groups', {
      number: current.value.group_no,
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
  await openGroup(row.number);
}

// Typing a complete number and pressing Enter shows that document.
async function lookupNumber() {
  if (mode.value === 'new' || !current.value.group_no.trim()) return;
  await openGroup(current.value.group_no.trim());
}

function lineChanged() {
  if (isEditable.value)
    current.value.items = ensureTrailingBlankLine(
      current.value.items,
      rowHasData,
      blankLine,
    );
}

// 「F2複製上一筆，F3插入一筆，F4刪除此筆。」
function lineKey(event: KeyboardEvent) {
  if (!isEditable.value) return;
  const items = lineKeyItems(event, current.value.items, {
    blank: blankLine,
    minimum: 15,
    copyPrevious: true,
  });
  if (items) {
    current.value.items = items;
    lineChanged();
  }
}

// F1 輔助輸入: the customer, and the customer's parts in the grid.
function assistCustomer() {
  void assist.open('customer', {
    prefix: current.value.customer_code,
    onSelect: (row) => {
      current.value.customer_code = row.code;
      if (isEditable.value) current.value.customer_name = row.short_name ?? '';
    },
  });
}

// F1 on 圖組編號 opens 「圖組建檔查詢」, every group in number order.
function assistGroupNo() {
  void assist.open('group-file', {
    prefix: mode.value === 'new' ? '' : current.value.group_no,
    onSelect: (row) => openGroup(row.group_no),
  });
}

// F1 on a line's 電腦圖號 opens the legacy 「圖組建檔」 picker: the
// customer's parts in drawing-number order, none marked; a click toggles ＊
// and 確定 writes the marked parts into the lines from this one on, leaving
// 數量 and 雷射工件 blank (seen on Win7 2026-10-07).
let pickerToken = 0;

async function assistPart(index: number) {
  const token = ++pickerToken;
  const state: PickerState = { index, rows: [], loading: true, error: '' };
  partPicker.value = state;
  try {
    const rows = await fetchAssistRows('part', {
      customer: current.value.customer_code,
      order: 'asc',
    });
    if (token === pickerToken && partPicker.value)
      partPicker.value = { ...state, rows, loading: false };
  } catch (error) {
    if (token === pickerToken && partPicker.value)
      partPicker.value = {
        ...state,
        loading: false,
        error: (error as Error).message,
      };
  }
}

function pickParts(keys: Set<unknown>) {
  if (!partPicker.value) return;
  const { index, rows } = partPicker.value;
  partPicker.value = null;
  const picked = rows.filter((row) => keys.has(row.drawing_no));
  const items = current.value.items as Row[];
  picked.forEach((row, offset) => {
    while (items.length <= index + offset)
      items.push(blankLine(items.length + 1));
    Object.assign(items[index + offset], {
      drawing_no: row.drawing_no,
      customer_drawing_no: row.customer_model ?? '',
      material: row.material ?? '',
      thickness: row.thickness ?? '',
    });
  });
  lineChanged();
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
      'group',
      selectedKey.value,
    );
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}
</script>

<template>
  <section class="legacy-form" :aria-label="title">
    <LegacyRecordToolbar
      :mode="mode"
      :has-record="selectedKey != null"
      :print-enabled="selectedKey != null"
      @print="printDocument"
      @add="addGroup"
      @edit="editGroup"
      @cancel="cancelEdit"
      @save="saveGroup"
      @delete="deleteGroup"
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
          ><span>圖組編號</span
          ><input
            v-model="current.group_no"
            :data-hint="FORM_HINT"
            maxlength="10"
            @keydown.enter.prevent="lookupNumber"
            @keydown.f1.prevent="assistGroupNo"
        /></label>
        <div class="legacy-form-field">
          <span>客　　戶</span>
          <input
            v-model="current.customer_code"
            maxlength="10"
            aria-label="客戶編號"
            @keydown.enter.prevent="!isEditable && openQuery()"
            @keydown.f1.prevent="assistCustomer"
          />
          <input
            v-model="current.customer_name"
            v-bind="lock"
            maxlength="10"
            aria-label="客戶名稱"
          />
        </div>
        <label class="legacy-form-field"
          ><span>建檔日期</span
          ><input
            v-model="current.created_date"
            class="num"
            v-bind="lock"
            maxlength="10"
        /></label>
      </div>
      <div class="legacy-form-column">
        <label class="legacy-form-field"
          ><span>客戶圖號</span
          ><input
            v-model="current.customer_drawing_no"
            class="wide"
            v-bind="lock"
            maxlength="40"
        /></label>
        <label class="legacy-form-field"
          ><span>備　　註</span
          ><input
            v-model="current.notes"
            :data-hint="PHRASE_HINT"
            class="wide"
            v-bind="lock"
            maxlength="20"
        /></label>
      </div>
    </form>

    <div class="legacy-grid" style="max-height: 372px">
      <table>
        <colgroup>
          <col style="width: 40px" />
          <col style="width: 89px" />
          <col style="width: 269px" />
          <col style="width: 89px" />
          <col style="width: 62px" />
          <col style="width: 89px" />
          <col style="width: 122px" />
        </colgroup>
        <thead>
          <tr>
            <th>項次</th>
            <th>電腦圖號</th>
            <th>客　戶　圖　號</th>
            <th>材　質</th>
            <th>厚度</th>
            <th>數　量</th>
            <th>雷射工件(Y/N)</th>
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
                :data-hint="LINE_HINTS.groups"
                v-bind="lock"
                maxlength="10"
                :aria-label="`第 ${index + 1} 列電腦圖號`"
                @input="lineChanged"
                @keydown.f1.prevent="isEditable && assistPart(index)"
              />
            </td>
            <td>
              <input
                v-model="item.customer_drawing_no"
                v-bind="lock"
                maxlength="40"
                :aria-label="`第 ${index + 1} 列客戶圖號`"
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
              />
            </td>
            <td>
              <input
                v-model="item.thickness"
                v-bind="lock"
                maxlength="6"
                :aria-label="`第 ${index + 1} 列厚度`"
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
                v-model="item.is_laser"
                v-bind="lock"
                maxlength="2"
                :aria-label="`第 ${index + 1} 列雷射工件`"
                @input="lineChanged()"
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
      title="圖組資料查詢"
      :columns="[
        { key: 'number', label: '圖組編號' },
        { key: 'party', label: '客戶' },
        { key: 'drawing', label: '客戶圖號' },
        { key: 'date', label: '建檔日期', align: 'right' },
      ]"
      :rows="queryState.rows"
      :loading="queryState.loading"
      :error="queryState.error"
      :truncated="queryState.truncated"
      @select="chooseQuery"
      @cancel="queryState = null"
    />

    <LegacySelectionWindow
      v-if="partPicker"
      title="圖組建檔"
      :columns="[
        { key: 'drawing_no', label: '電腦圖號' },
        { key: 'customer_model', label: '客戶型號' },
        { key: 'material', label: '材質' },
        { key: 'thickness', label: '厚度' },
      ]"
      row-key="drawing_no"
      :rows="partPicker.rows"
      :loading="partPicker.loading"
      :error="partPicker.error"
      :initial="[]"
      click-toggles
      hint="若要變更選擇，用↑、↓鍵移方框至該筆再按空白鍵，或滑鼠敲擊(click)該筆，可切換選取狀態(具＊者為選擇項)。"
      @confirm="pickParts"
      @cancel="partPicker = null"
    />
    <LegacyDocumentPrint
      v-if="printState"
      :label="printState.label"
      :pages="printState.pages"
      :log="printState.log"
      @close="printState = null"
    />
    <LegacyAssistHost :assist="assist" />
  </section>
</template>
