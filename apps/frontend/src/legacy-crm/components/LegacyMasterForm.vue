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
import { useCloseWindow } from '../utils/legacyWindow';
import { FORM_HINT } from '../utils/statusHints';

// A legacy master-file form (檔案 menu, isin_vb6 docs/legacy-ui-spec.md): the
// 新增 F5 … 關閉 C button row and columns of cyan 「標籤：」 fields. Records
// are reached with 頭筆～尾筆, 查詢 R, or by typing a key and pressing Enter.
// With `crm` read only, the fields other than the key stay disabled.
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
const isEditable = computed(
  () => !readOnly.value && (mode.value === 'new' || mode.value === 'edit'),
);
const searchField = computed(() => props.searchField || props.keyField);

type ItemResponse = { item: Record<string, any> };

const pathFor = (key: string) =>
  props.itemPath
    ? props.itemPath(key)
    : `${props.endpoint}/${encodeURIComponent(key)}`;

function show(item: Record<string, any>) {
  current.value = { ...props.blank(), ...props.fromItem(item) };
  selectedKey.value = String(item[props.keyField]);
  mode.value = 'edit';
  errorMessage.value = '';
  statusMessage.value = '';
  emit('loaded', current.value);
}

async function open(key: string) {
  try {
    show((await legacyGet<ItemResponse>(pathFor(key))).item);
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

function add() {
  selectedKey.value = null;
  current.value = props.blank();
  mode.value = 'new';
  errorMessage.value = '';
  statusMessage.value = '';
  emit('loaded', current.value);
}

// 更新 F6 saves the record as changed on the form, after the legacy
// 「確定修改這筆資料？」.
async function edit() {
  if (selectedKey.value == null || mode.value !== 'edit') return;
  if (!window.confirm('確定修改這筆資料？')) return;
  await save();
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
    statusMessage.value = '存檔完成';
    // 工件建檔 clears and starts the next 新增 after saving a new record.
    if (isNew && props.addAfterSave) add();
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

async function remove() {
  if (selectedKey.value == null) return;
  if (!window.confirm('確定刪除這筆資料？')) return;
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
    statusMessage.value = '已刪除';
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
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
      statusMessage.value =
        direction === 'next' || direction === 'last'
          ? '已是最後一筆'
          : '已是第一筆';
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
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
}

// Typing a complete key and pressing Enter shows that record; for materials
// it opens the query window instead, since they have no typed key.
async function lookupKey() {
  const value = String(current.value[searchField.value] ?? '').trim();
  if (mode.value === 'new' || !value) return;
  if (props.searchField) await openQuery();
  else await open(value);
}

function display(field: Record<string, any>) {
  const value = current.value[field.key];
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
    window.alert(spec.required);
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
  <section class="legacy-form legacy-master" :aria-label="title">
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

    <form class="legacy-master-fields" @submit.prevent>
      <div
        v-for="(column, columnIndex) in columns"
        :key="columnIndex"
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
              :value="isEditable ? current[field.key] : display(field)"
              :disabled="
                field.readonly ||
                (field.key !== keyField &&
                  !isEditable &&
                  field.key !== searchField)
              "
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
                  ? lookupKey()
                  : field.onEnter?.(current, isEditable)
              "
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
    <p
      class="legacy-form-message"
      :class="{ error: errorMessage }"
      role="status"
    >
      {{ errorMessage || statusMessage }}
    </p>

    <LegacyQueryWindow
      v-if="queryState"
      :title="queryTitle"
      :columns="queryColumns"
      :rows="queryState.rows"
      :loading="queryState.loading"
      :error="queryState.error"
      :truncated="queryState.truncated"
      @select="chooseQuery"
      @cancel="queryState = null"
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
