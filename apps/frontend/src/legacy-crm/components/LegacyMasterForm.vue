<script setup lang="ts">
import { computed, nextTick, ref, type PropType } from 'vue';
import LegacyAssistHost from './LegacyAssistHost.vue';
import LegacyExpandWindow from './LegacyExpandWindow.vue';
import LegacyQueryWindow from './LegacyQueryWindow.vue';
import LegacyRecordToolbar from './LegacyRecordToolbar.vue';
import { legacyGet, legacySend } from '../services/legacyApi';
import { useLegacyReadOnly } from '../utils/legacyAccess';
import { useLegacyAssist } from '../utils/legacyAssist';
import {
  navigateDocument,
  neighbourDocument,
  queryDocuments,
  type BrowseDirection,
} from '../utils/legacyBrowse';
import { legacyAlert, legacyConfirm } from '../utils/legacyMessage';
import { useCloseWindow } from '../utils/legacyWindow';
import { FORM_HINT } from '../utils/statusHints';

// A legacy master-file form (檔案 menu, isin_vb6 docs/legacy-ui-spec.md): the
// 新增 F5 … 關閉 C button row and columns of cyan 「標籤：」 fields. Records
// are reached with 頭筆～尾筆, 查詢 R, or by typing a key and pressing Enter.
// With `crm` read only, the fields other than the key stay disabled.
// Keyboard and focus as on Win7 (2026-10-08): Enter and ↓ go to the next
// field, ↑ to the previous one; Tab runs through the fields and then the
// buttons. After a button, the key field gets the focus with its text
// selected; after a key lookup, the next field does. Messages are Windows
// message boxes (legacyMessage.ts).
const props = defineProps({
  title: { type: String, required: true },
  // Browse type (documents/:type/…) and the collection path under /legacy-crm.
  browseType: { type: String, required: true },
  endpoint: { type: String, required: true },
  keyField: { type: String, required: true },
  // Field columns: [[{ key, label, size: "short"|"medium"|"wide", align, decimals, small }]];
  // an entry of { gap: true } leaves an empty row. A field's `assist`
  // ({ kind, apply(current, row), required }) is its F1 輔助輸入 window; F1 on
  // the key field opens 查詢. `onFocus(current)` runs as an editable field
  // gets the focus, for the legacy fill-ins.
  columns: { type: Array as PropType<any[][]>, required: true },
  blank: {
    type: Function as PropType<() => Record<string, any>>,
    required: true,
  },
  // Turns the form record into the request body, and a stored record into
  // the form record.
  toPayload: {
    type: Function as PropType<(record: Record<string, any>) => unknown>,
    default: (record: Record<string, any>) => record,
  },
  fromItem: {
    type: Function as PropType<
      (item: Record<string, any>) => Record<string, any>
    >,
    default: (item: Record<string, any>) => item,
  },
  queryColumns: { type: Array as PropType<any[]>, required: true },
  queryTitle: { type: String, required: true },
  noun: { type: String, required: true },
  // Path for one record; defaults to `${endpoint}/${key}`.
  itemPath: {
    type: Function as PropType<((key: string) => string) | null>,
    default: null,
  },
  // Field typed into for 查詢 and Enter lookups when it is not the key
  // (materials search by material).
  searchField: { type: String, default: '' },
  // F12 opens the 展開顯示 window on every field (客戶、廠商、員工).
  expand: { type: Boolean, default: false },
  addAfterSave: { type: Boolean, default: false },
  // Win7 geometry of this form (measured 2026-10-08): `top` is the first
  // row's y on the screen, `pitch` the distance between rows, `labelHeight`
  // the cyan label's height, `gaps` the space before each column after the
  // first. A field's `width` (px, borders included) overrides its size.
  layout: {
    type: Object as PropType<{
      top?: number;
      pitch?: number;
      labelHeight?: number;
      gaps?: number[];
    }>,
    default: () => ({}),
  },
});
const emit = defineEmits(['loaded']);

const current = ref<Record<string, any>>(props.blank());
const selectedKey = ref<string | null>(null);
const mode = ref('view');
const errorMessage = ref('');
const statusMessage = ref('');
const queryState = ref<{
  rows: any[];
  loading: boolean;
  error: string;
  truncated: boolean;
} | null>(null);
const closeWindow = useCloseWindow();
const assist = useLegacyAssist();
const readOnly = useLegacyReadOnly();
// The legacy fields can be typed into at any time, also on the empty form;
// only 更新／存檔 write anything.
const isEditable = computed(() => !readOnly.value);
const formRoot = ref<HTMLElement | null>(null);
// The button row ends at y 74 on the screen (MDI client 42 + 2px edge + 30).
const layoutStyle = computed(() => ({
  marginTop: `${(props.layout.top ?? 97) - 74}px`,
  '--lg-row-gap': `${(props.layout.pitch ?? 26) - 24}px`,
  '--lg-label-height': `${props.layout.labelHeight ?? 22}px`,
}));
const columnStyle = (index: number) =>
  index > 0 && props.layout.gaps?.[index - 1] != null
    ? { marginLeft: `${props.layout.gaps[index - 1] - 39}px` }
    : undefined;
const searchField = computed(() => props.searchField || props.keyField);

type ItemResponse = { item: Record<string, any> };

const pathFor = (key: string) =>
  props.itemPath
    ? props.itemPath(key)
    : `${props.endpoint}/${encodeURIComponent(key)}`;

function fieldInput(key: string) {
  return formRoot.value?.querySelector<HTMLInputElement>(
    `input[data-field="${key}"]`,
  );
}

// The fields and buttons in the order Tab visits them.
function focusables() {
  return Array.from(
    formRoot.value?.querySelectorAll<HTMLElement>(
      'input:not([disabled]):not([tabindex="-1"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([tabindex="-1"])',
    ) ?? [],
  ).filter((element) => !element.closest('[role="dialog"]'));
}

function focusElement(element: HTMLElement | undefined, select = true) {
  if (!element) return;
  element.focus();
  if (element instanceof HTMLInputElement) {
    if (select) element.select();
    else element.setSelectionRange(0, 0);
  }
}

function focusKey() {
  void nextTick(() => focusElement(fieldInput(searchField.value) ?? undefined));
}

function moveFocus(from: EventTarget | null, step: number, select = true) {
  const list = focusables();
  const index = list.indexOf(from as HTMLElement);
  if (index < 0) return;
  focusElement(list[(index + step + list.length) % list.length], select);
}

// Numbers show as the legacy text boxes did: 0 as blank, prices with their
// decimals (Win7: 備料單價 30.00, 存款金額 0 blank, 帳款 -189).
// Dates are the legacy 10-character texts, right-aligned with spaces
// (Win7: 「  91.02.07」, 「 114.07.30」).
function formatNumbers(record: Record<string, any>) {
  for (const field of props.columns.flat()) {
    if (field.date && record[field.key])
      record[field.key] = String(record[field.key]).trim().padStart(10);
    if (!field.key || (field.decimals == null && field.align !== 'right'))
      continue;
    record[field.key] = display(
      { ...field, decimals: field.decimals ?? 0 },
      record,
    );
  }
  return record;
}

function show(item: Record<string, any>) {
  current.value = formatNumbers({ ...props.blank(), ...props.fromItem(item) });
  selectedKey.value = String(item[props.keyField]);
  mode.value = 'edit';
  errorMessage.value = '';
  statusMessage.value = '';
  emit('loaded', current.value);
}

async function open(key: string) {
  try {
    show((await legacyGet<ItemResponse>(pathFor(key))).item);
    return true;
  } catch (error) {
    await legacyAlert('資料查詢', (error as Error).message);
    return false;
  }
}

function add() {
  selectedKey.value = null;
  current.value = props.blank();
  mode.value = 'new';
  errorMessage.value = '';
  statusMessage.value = '';
  emit('loaded', current.value);
  focusKey();
}

// 更新 F6 saves the record as changed on the form, after the legacy
// 「確定修改這筆資料？」.
async function edit() {
  if (selectedKey.value == null || mode.value !== 'edit') {
    await legacyAlert('資料修改', '請先設定編號。');
    focusKey();
    return;
  }
  if (await legacyConfirm('資料修改', '確定修改這筆資料？')) await save();
  focusKey();
}

async function cancel() {
  if (mode.value === 'new' || selectedKey.value == null) {
    selectedKey.value = null;
    current.value = props.blank();
    mode.value = 'view';
    emit('loaded', current.value);
  } else {
    await open(selectedKey.value);
  }
  errorMessage.value = '';
  statusMessage.value = '';
  focusKey();
}

async function save() {
  errorMessage.value = '';
  statusMessage.value = '';
  const isNew = mode.value === 'new';
  try {
    const payload = await legacySend<ItemResponse>(
      isNew ? props.endpoint : pathFor(selectedKey.value as string),
      isNew ? 'POST' : 'PUT',
      props.toPayload(current.value),
    );
    show(payload.item);
    // 工件建檔 clears and starts the next 新增 after saving a new record.
    if (isNew && props.addAfterSave) add();
    else focusKey();
  } catch (error) {
    await legacyAlert(
      isNew ? '資料新增' : '資料修改',
      (error as Error).message,
    );
    focusKey();
  }
}

async function remove() {
  if (selectedKey.value == null) {
    await legacyAlert('資料刪除', '請先設定編號。');
    focusKey();
    return;
  }
  if (!(await legacyConfirm('資料刪除', '確定刪除這筆資料？'))) {
    focusKey();
    return;
  }
  const deletedKey = selectedKey.value;
  try {
    // The record to show next, found while the deleted one is still on file.
    const neighbour = await neighbourDocument(props.browseType, deletedKey);
    await legacySend(pathFor(deletedKey), 'DELETE');
    selectedKey.value = null;
    current.value = props.blank();
    mode.value = 'view';
    emit('loaded', current.value);
    if (neighbour != null) await open(neighbour);
  } catch (error) {
    await legacyAlert('資料刪除', (error as Error).message);
  }
  focusKey();
}

async function navigate(direction: BrowseDirection) {
  if (mode.value === 'new') return;
  errorMessage.value = '';
  try {
    const key = await navigateDocument(
      props.browseType,
      direction,
      selectedKey.value ?? '',
    );
    if (key != null) await open(key);
    else
      await legacyAlert(
        '資料查詢',
        direction === 'next' || direction === 'last'
          ? '已到最後一筆'
          : '已到第一筆',
      );
  } catch (error) {
    await legacyAlert('資料查詢', (error as Error).message);
  }
  focusKey();
}

async function openQuery() {
  const state = { rows: [], loading: true, error: '', truncated: false };
  queryState.value = state;
  try {
    const payload = await queryDocuments(props.browseType, {
      number: String(current.value[searchField.value] ?? ''),
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

async function chooseQuery(row: Record<string, any>) {
  queryState.value = null;
  await open(row.number);
  focusKey();
}

function cancelQuery() {
  queryState.value = null;
  focusKey();
}

// Typing a complete key and pressing Enter shows that record and moves on
// to the next field (Win7: 全名 selected; after 「找不到這筆資料。」 the caret
// sits at its start). For materials it opens the query window instead,
// since they have no typed key.
async function lookupKey(event: KeyboardEvent) {
  const input = event.target;
  const value = String(current.value[searchField.value] ?? '').trim();
  if (mode.value === 'new' || !value) {
    moveFocus(input, 1);
    return;
  }
  if (props.searchField) {
    await openQuery();
    return;
  }
  const found = await open(value);
  await nextTick();
  moveFocus(input, 1, found);
}

function nextField(field: Record<string, any>, event: KeyboardEvent) {
  field.onEnter?.(current.value, isEditable.value);
  moveFocus(event.target, 1);
}

function display(
  field: Record<string, any>,
  record: Record<string, any> = current.value,
) {
  const value = record[field.key];
  if (field.decimals == null || value === '' || value == null)
    return value ?? '';
  const number = Number(value);
  return Number.isFinite(number) && number !== 0
    ? number.toFixed(field.decimals)
    : '';
}

function assistField(field: Record<string, any>) {
  if (field.key === searchField.value) {
    void openQuery();
    return;
  }
  const spec = field.assist;
  if (!spec) return;
  const value = String(current.value[field.key] ?? '').trim();
  if (spec.required && !value) {
    void legacyAlert('輸入檢查', spec.required);
    return;
  }
  void assist.open(spec.kind, {
    prefix: value,
    onSelect: (row) => spec.apply(current.value, row),
  });
}

function setValue(field: Record<string, any>, value: unknown) {
  current.value[field.key] = value;
}

const expandState = ref<{
  field: Record<string, any>;
  input: HTMLInputElement;
  title: string;
} | null>(null);
function openExpand(field: Record<string, any>, event: Event) {
  if (!props.expand) return;
  expandState.value = {
    field,
    input: event.target as HTMLInputElement,
    title: `${field.label}${field.required ? '＊' : '：'}`,
  };
}

function closeExpand(text?: string) {
  if (!expandState.value) return;
  const { field, input } = expandState.value;
  expandState.value = null;
  if (text !== undefined) setValue(field, text);
  void nextTick(() => {
    input.focus();
    input.select();
  });
}

// 新增 with fields already filled, as 訂單登錄 F2 opens 工件建檔.
function addWith(values: Record<string, any>) {
  add();
  current.value = { ...current.value, ...values };
  emit('loaded', current.value);
}

defineExpose({
  current,
  mode,
  isEditable,
  selectedKey,
  statusMessage,
  errorMessage,
  open,
  addWith,
});
</script>

<template>
  <section ref="formRoot" class="legacy-form legacy-master" :aria-label="title">
    <form class="legacy-master-fields" :style="layoutStyle" @submit.prevent>
      <div
        v-for="(column, columnIndex) in columns"
        :key="columnIndex"
        :style="columnStyle(columnIndex)"
        class="legacy-form-column"
      >
        <template
          v-for="(field, index) in column"
          :key="field.key ?? `gap-${index}`"
        >
          <div v-if="field.gap" class="legacy-master-gap"></div>
          <slot
            v-else-if="field.slot"
            :name="field.slot"
            :current="current"
            :editable="isEditable"
          />
          <label
            v-else
            class="legacy-form-field legacy-master-field"
            :class="{ 'small-label': field.small }"
          >
            <span>{{ field.label }}{{ field.required ? '＊' : '：' }}</span>
            <input
              :class="[
                field.size ?? 'short',
                { num: field.align === 'right' || field.decimals != null },
              ]"
              :style="field.width ? { width: `${field.width}px` } : undefined"
              :value="isEditable ? current[field.key] : display(field)"
              :disabled="
                field.readonly ||
                (field.key !== keyField &&
                  !isEditable &&
                  field.key !== searchField)
              "
              :data-field="field.key"
              :maxlength="field.maxLength"
              :data-hint="
                field.hint ??
                (field.key === searchField ? FORM_HINT : undefined)
              "
              :inputmode="field.decimals != null ? 'decimal' : undefined"
              :list="field.list"
              @input="
                setValue(field, ($event.target as HTMLInputElement).value)
              "
              @change="field.onChange?.(current, isEditable)"
              @focus="isEditable && field.onFocus?.(current)"
              @keydown.enter.prevent="
                field.key === searchField
                  ? lookupKey($event)
                  : nextField(field, $event)
              "
              @keydown.down.prevent="moveFocus($event.target, 1)"
              @keydown.up.prevent="moveFocus($event.target, -1)"
              @keydown.f1.prevent="assistField(field)"
              @keydown.f12.prevent="openExpand(field, $event)"
            />
            <slot
              :name="`after-${field.key}`"
              :current="current"
              :editable="isEditable"
            />
          </label>
        </template>
      </div>
      <slot name="aside" :current="current" :editable="isEditable" />
    </form>
    <slot name="below" :current="current" :editable="isEditable" />
    <!-- After the fields in the Tab order, shown on top (CSS order). -->
    <LegacyRecordToolbar
      :mode="mode"
      :has-record="selectedKey != null"
      :print="false"
      @add="add"
      @edit="edit"
      @cancel="cancel"
      @save="save"
      @delete="remove"
      @query="openQuery"
      @previous="navigate('previous')"
      @next="navigate('next')"
      @first="navigate('first')"
      @last="navigate('last')"
      @close="closeWindow"
    >
      <template #extra>
        <slot
          name="buttons"
          :current="current"
          :mode="mode"
          :selectedKey="selectedKey"
          :readOnly="readOnly"
        />
      </template>
    </LegacyRecordToolbar>

    <LegacyQueryWindow
      v-if="queryState"
      :title="queryTitle"
      :columns="queryColumns"
      :rows="queryState.rows"
      :loading="queryState.loading"
      :error="queryState.error"
      :truncated="queryState.truncated"
      @select="chooseQuery"
      @cancel="cancelQuery"
    />
    <LegacyAssistHost :assist="assist" />
    <LegacyExpandWindow
      v-if="expandState"
      :title="expandState.title"
      :value="String(current[expandState.field.key] ?? '')"
      :max-length="expandState.field.maxLength"
      @confirm="closeExpand"
      @cancel="closeExpand()"
    />
  </section>
</template>
