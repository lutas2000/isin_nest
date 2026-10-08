<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import LegacyMasterForm from './LegacyMasterForm.vue';
import { legacyGet, legacySend } from '../services/legacyApi';
import { ASSIST_HINT, SUPPLIER_EXPAND_HINT } from '../utils/statusHints';

// 客戶資料／廠商資料 as on Win7 (isin_vb6 docs/legacy-ui-spec.md).
const props = defineProps({
  kind: { type: String, required: true },
  title: { type: String, required: true },
});

const isCustomer = computed(() => props.kind === 'customer');
const label = computed(() => (isCustomer.value ? '客戶' : '廠商'));

const columns = computed(() =>
  withHints([
    [
      {
        key: 'code',
        label: `${label.value}編號`,
        required: true,
        size: 'short',
        maxLength: 10,
      },
      {
        key: 'full_name',
        label: `${label.value}全名`,
        size: 'wide',
        maxLength: 40,
      },
      {
        key: 'short_name',
        label: `${label.value}簡稱`,
        required: true,
        size: 'short',
        maxLength: 10,
      },
      { key: 'responsible', label: '負 責 人', size: 'short', maxLength: 10 },
      {
        key: 'phone1',
        label: '電 話 一',
        required: true,
        size: 'wide',
        maxLength: 30,
      },
      { key: 'phone2', label: '電 話 二', size: 'wide', maxLength: 30 },
      { key: 'fax', label: '傳　　真', size: 'wide', maxLength: 30 },
      { key: 'tax_id', label: '統一編號', size: 'short', maxLength: 8 },
      { key: 'postal_code', label: '郵遞區號', size: 'short', maxLength: 10 },
      {
        key: 'address',
        label: isCustomer.value ? '通訊地址' : '公司地址',
        size: 'wide',
        maxLength: 60,
      },
      {
        key: 'shipping_address',
        label: isCustomer.value ? '送貨地址' : '工廠地址',
        size: 'wide',
        maxLength: 60,
      },
      {
        key: 'invoice_title',
        label: '發票抬頭(2)',
        small: true,
        size: 'wide',
        maxLength: 40,
      },
      {
        key: 'invoice_tax_id',
        label: '統一編號(2)',
        small: true,
        size: 'short',
        maxLength: 10,
      },
    ],
    [
      { key: 'bank_name', label: '往來銀行', size: 'wide', maxLength: 30 },
      { key: 'bank_account', label: '帳戶號碼', size: 'wide', maxLength: 30 },
      { key: 'contact1', label: '連絡人一', size: 'wide', maxLength: 30 },
      { key: 'contact2', label: '連絡人二', size: 'wide', maxLength: 30 },
      { key: 'contact3', label: '連絡人三', size: 'wide', maxLength: 30 },
      {
        key: 'start_date',
        date: true,
        label: '開始交易日期',
        small: true,
        size: 'medium',
        maxLength: 10,
      },
      {
        key: 'latest_transaction_date',
        date: true,
        label: '最近交易日期',
        small: true,
        size: 'medium',
        maxLength: 10,
      },
      ...(isCustomer.value
        ? [
            {
              key: 'credit_limit',
              label: '信用額度',
              size: 'medium',
              align: 'right',
            },
            {
              key: 'balance',
              label: '帳　　款',
              size: 'medium',
              align: 'right',
            },
          ]
        : [{ gap: true }]),
      { key: 'email', label: '電子郵箱', size: 'wide', maxLength: 60 },
      ...(isCustomer.value
        ? [{ key: 'dxf_path', label: 'DXF 路徑', width: 242, maxLength: 100 }]
        : []),
      { key: 'main_product', label: '主要產品', size: 'wide', maxLength: 60 },
      { key: 'notes', label: '備　　註', size: 'wide', maxLength: 100 },
    ],
  ]),
);

// Status-bar texts (Win7 2026-10-08): the 客戶 form shows「F1輔助輸入。」on
// four fields and clears the bar elsewhere; the 廠商 form shows it on four
// others,「F12展開顯示。」on the rest and clears it on the two addresses.
const ASSIST_FIELDS: Record<string, string[]> = {
  customer: ['short_name', 'phone1', 'postal_code', 'dxf_path'],
  supplier: ['short_name', 'phone1', 'phone2', 'postal_code'],
};
const SUPPLIER_BLANK_FIELDS = ['code', 'address', 'shipping_address'];
function withHints(columns: any[][]) {
  return columns.map((column) =>
    column.map((field: Record<string, any>) => {
      if (!field.key) return field;
      const filled = FILL_INS[field.key]
        ? { ...field, onFocus: FILL_INS[field.key] }
        : field;
      if (ASSIST_FIELDS[props.kind].includes(field.key))
        return { ...filled, hint: ASSIST_HINT };
      if (!isCustomer.value && !SUPPLIER_BLANK_FIELDS.includes(field.key))
        return { ...filled, hint: SUPPLIER_EXPAND_HINT };
      return filled;
    }),
  );
}

// Fill-ins as a blank field gets the focus (the legacy Text1 GotFocus,
// Win7 2026-10-08), the same on both forms: 簡稱 takes the first four
// characters of 全名; 通訊／公司地址 takes the 郵遞區號's region name;
// 送貨／工廠地址 takes 通訊／公司地址.
const isBlank = (value: unknown) => !String(value ?? '').trim();
const FILL_INS: Record<string, (current: Record<string, any>) => unknown> = {
  short_name(current) {
    if (isBlank(current.short_name))
      current.short_name = [...String(current.full_name ?? '')]
        .slice(0, 4)
        .join('');
  },
  async address(current) {
    const postalCode = String(current.postal_code ?? '').trim();
    if (!postalCode || !isBlank(current.address)) return;
    const payload = await legacyGet<{ item?: { region_name?: string } }>(
      `/postal-codes/${encodeURIComponent(postalCode)}`,
    ).catch(() => null);
    const region = String(payload?.item?.region_name ?? '').trim();
    if (region && isBlank(current.address)) current.address = region;
  },
  shipping_address(current) {
    if (isBlank(current.shipping_address))
      current.shipping_address = current.address ?? '';
  },
};

function blank() {
  return {
    kind: props.kind,
    code: '',
    full_name: '',
    short_name: '',
    responsible: '',
    phone1: '',
    phone2: '',
    fax: '',
    tax_id: '',
    postal_code: '',
    address: '',
    shipping_address: '',
    invoice_title: '',
    invoice_tax_id: '',
    bank_name: '',
    bank_account: '',
    contact1: '',
    contact2: '',
    contact3: '',
    start_date: '',
    latest_transaction_date: '',
    credit_limit: '',
    balance: '',
    email: '',
    dxf_path: '',
    main_product: '',
    notes: '',
  };
}

const toPayload = (record: Record<string, any>) => ({
  ...record,
  kind: props.kind,
});
const itemPath = (code: string) =>
  `/partners/${encodeURIComponent(props.kind)}/${encodeURIComponent(code)}`;
const queryColumns = [
  { key: 'number', label: '編號' },
  { key: 'name', label: '全名' },
  { key: 'responsible', label: '負責人' },
  { key: 'phone', label: '電話' },
  { key: 'main_product', label: '主要產品' },
];

// 更改編號 (customers only): the legacy 「客戶編號更改」 prompt asks for the
// new code; the customer and everything filed under the old code move to it.
const form = ref<InstanceType<typeof LegacyMasterForm> | null>(null);
const renaming = ref<{ from: string; to: string; error: string } | null>(null);
const renameInput = ref<HTMLInputElement | null>(null);

function openRename(selectedKey: string | null) {
  if (selectedKey == null) return;
  renaming.value = { from: String(selectedKey), to: '', error: '' };
  nextTick(() => renameInput.value?.focus());
}

async function confirmRename() {
  const state = renaming.value;
  if (!state) return;
  const to = state.to.trim();
  if (!to) {
    renaming.value = null;
    return;
  }
  try {
    const payload = await legacySend<{ item: { code: string } }>(
      `${itemPath(state.from)}/rename`,
      'POST',
      { code: to },
    );
    renaming.value = null;
    await form.value?.open(payload.item.code);
  } catch (error) {
    window.alert((error as Error).message);
    nextTick(() => renameInput.value?.focus());
  }
}
</script>

<template>
  <LegacyMasterForm
    ref="form"
    :key="kind"
    expand
    :title="title"
    :browse-type="isCustomer ? 'customers' : 'suppliers'"
    endpoint="/partners"
    key-field="code"
    :item-path="itemPath"
    :columns="columns"
    :blank="blank"
    :to-payload="toPayload"
    :query-columns="queryColumns"
    :query-title="`${label}資料查詢`"
    :noun="label"
  >
    <template v-if="isCustomer" #buttons="{ mode, selectedKey, readOnly }">
      <button
        type="button"
        :disabled="readOnly || mode === 'new' || selectedKey == null"
        @click="openRename(selectedKey)"
      >
        更改編號
      </button>
    </template>
    <template #after-dxf_path>
      <button
        type="button"
        class="legacy-browse-button"
        tabindex="-1"
        disabled
        title="瀏覽器無法取得完整路徑，請直接輸入"
      >
        ...
      </button>
    </template>
  </LegacyMasterForm>
  <div v-if="renaming" class="legacy-modal-backdrop legacy-prompt-backdrop">
    <form
      class="legacy-prompt"
      role="dialog"
      aria-modal="true"
      aria-label="客戶編號更改"
      @submit.prevent="confirmRename"
      @keydown.esc.prevent.stop="renaming = null"
    >
      <div class="legacy-dialog-title"><span>客戶編號更改</span></div>
      <label class="legacy-prompt-field"
        >請輸入新的編號：<input
          ref="renameInput"
          v-model="renaming.to"
          maxlength="10"
      /></label>
      <div class="legacy-prompt-buttons">
        <button type="submit">確　定</button>
        <button type="button" @click="renaming = null">取　消</button>
      </div>
    </form>
  </div>
</template>
