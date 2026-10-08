<script setup lang="ts">
import { computed } from 'vue';
import LegacyMasterForm from './LegacyMasterForm.vue';

// 材質建檔、銀行建檔、詞彙資料、郵遞區號 as on Win7 (isin_vb6
// docs/legacy-ui-spec.md). 員工資料 is kept in the new system's HR (staff),
// not here (LEGACY-CRM-REBUILD-PLAN.md 2.3).
const props = defineProps({
  kind: { type: String, required: true },
  title: { type: String, required: true },
});

interface MasterDefinition {
  endpoint: string;
  key: string;
  searchField?: string;
  noun: string;
  queryTitle: string;
  columns: Record<string, any>[][];
  queryColumns: { key: string; label: string }[];
  // Win7 geometry (LegacyMasterForm `layout`).
  layout: { top?: number; pitch?: number; labelHeight?: number };
}

const definitions: Record<string, MasterDefinition> = {
  materials: {
    endpoint: '/materials',
    key: 'id',
    searchField: 'material',
    noun: '材質',
    queryTitle: '材質資料查詢',
    layout: { pitch: 28 },
    columns: [
      [
        {
          key: 'material',
          label: '材　　質',
          width: 90,
          size: 'short',
          maxLength: 10,
        },
        {
          key: 'thickness',
          label: '厚　　度',
          width: 90,
          size: 'short',
          maxLength: 6,
        },
        {
          key: 'product_name',
          label: '品　　名',
          width: 200,
          size: 'wide',
          maxLength: 100,
        },
        {
          key: 'category',
          label: '分　　類',
          width: 90,
          size: 'short',
          maxLength: 10,
        },
      ],
    ],
    queryColumns: [
      { key: 'material', label: '材質' },
      { key: 'thickness', label: '厚度' },
      { key: 'product_name', label: '品名' },
      { key: 'category', label: '分類' },
    ],
  },
  banks: {
    endpoint: '/banks',
    key: 'code',
    noun: '銀行',
    queryTitle: '銀行資料查詢',
    layout: { top: 91, pitch: 28, labelHeight: 24 },
    columns: [
      [
        {
          key: 'code',
          label: '銀行編號',
          width: 133,
          size: 'short',
          maxLength: 10,
        },
        {
          key: 'full_name',
          label: '銀行全名',
          width: 333,
          size: 'wider',
          maxLength: 40,
        },
        {
          key: 'short_name',
          label: '銀行簡稱',
          width: 133,
          size: 'short',
          maxLength: 10,
        },
        {
          key: 'phone1',
          label: '電 話 一',
          width: 133,
          size: 'short',
          maxLength: 20,
        },
        {
          key: 'phone2',
          label: '電 話 二',
          width: 133,
          size: 'short',
          maxLength: 20,
        },
        {
          key: 'contact',
          label: '連 絡 人',
          width: 133,
          size: 'short',
          maxLength: 10,
        },
        {
          key: 'account_no',
          label: '帳戶號碼',
          width: 133,
          size: 'short',
          maxLength: 30,
        },
        {
          key: 'account_name',
          label: '帳戶名稱',
          width: 133,
          size: 'short',
          maxLength: 30,
        },
        {
          key: 'balance',
          label: '存款金額',
          width: 133,
          size: 'short',
          align: 'right',
        },
        {
          key: 'address',
          label: '地　　址',
          width: 333,
          size: 'wider',
          maxLength: 60,
        },
        {
          key: 'notes',
          label: '備　　註',
          width: 333,
          size: 'wider',
          maxLength: 100,
        },
      ],
    ],
    queryColumns: [
      { key: 'number', label: '編號' },
      { key: 'name', label: '全名' },
      { key: 'short_name', label: '簡稱' },
      { key: 'phone', label: '電話' },
    ],
  },
  phrases: {
    endpoint: '/phrases',
    key: 'phrase_no',
    noun: '詞彙',
    layout: { pitch: 28 },
    queryTitle: '詞彙資料查詢',
    columns: [
      [
        {
          key: 'phrase_no',
          label: '詞彙編號',
          width: 80,
          size: 'short',
          maxLength: 10,
        },
        {
          key: 'content',
          label: '內　　容',
          width: 667,
          size: 'full',
          maxLength: 250,
        },
      ],
    ],
    queryColumns: [
      { key: 'number', label: '詞彙編號' },
      { key: 'content', label: '內容' },
    ],
  },
  'postal-codes': {
    endpoint: '/postal-codes',
    key: 'postal_code',
    noun: '郵遞區號',
    layout: { pitch: 28 },
    queryTitle: '郵遞區號查詢',
    columns: [
      [
        {
          key: 'postal_code',
          label: '郵遞區號',
          width: 67,
          size: 'short',
          maxLength: 10,
        },
        {
          key: 'region_name',
          label: '地區名稱',
          width: 200,
          size: 'wide',
          maxLength: 100,
        },
      ],
    ],
    queryColumns: [
      { key: 'number', label: '郵遞區號' },
      { key: 'region_name', label: '地區名稱' },
    ],
  },
};

// 支票列印位置設定 on the bank form: most items have one X/Y position; the
// date, payee, due date and amount have a second one.
const checkPrintFields = [
  { key: 'year', label: '年' },
  { key: 'month', label: '月' },
  { key: 'day', label: '日' },
  { key: 'payment_text', label: '憑票支付' },
  { key: 'ntd_text', label: '新台幣' },
  { key: 'currency_prefix', label: 'NT$' },
  { key: 'non_endorsable', label: '禁止背書轉讓' },
  { key: 'bank_account', label: '銀行帳號' },
  { key: 'issue_date', label: '開票日期', second: true },
  { key: 'payee', label: '受 款 人', second: true },
  { key: 'due_date', label: '到 期 日', second: true },
  { key: 'expense_amount', label: '支出金額', second: true },
];

const definition = computed(() => definitions[props.kind]);

type CheckLayout = {
  corrections: { x: string; y: string };
  fields: Record<
    string,
    { layout1: { x: string; y: string }; layout2: { x: string; y: string } }
  >;
};

function blankCheckLayout(): CheckLayout {
  return {
    corrections: { x: '', y: '' },
    fields: Object.fromEntries(
      checkPrintFields.map(({ key }) => [
        key,
        {
          layout1: { x: '', y: '' },
          layout2: { x: '', y: '' },
        },
      ]),
    ),
  };
}

function blank() {
  const record: Record<string, any> = Object.fromEntries(
    definition.value.columns.flat().map(({ key }) => [key, '']),
  );
  if (props.kind === 'banks') record.check_layout = blankCheckLayout();
  return record;
}

function fromItem(item: Record<string, any>) {
  if (props.kind !== 'banks') return item;
  const layout = blankCheckLayout();
  for (const [key, value] of Object.entries(item.check_layout?.fields ?? {}))
    layout.fields[key] = { ...layout.fields[key], ...(value as object) };
  layout.corrections = {
    ...layout.corrections,
    ...(item.check_layout?.corrections ?? {}),
  };
  return { ...item, check_layout: layout };
}
</script>

<template>
  <LegacyMasterForm
    :key="kind"
    :title="title"
    :browse-type="kind"
    :endpoint="definition.endpoint"
    :key-field="definition.key"
    :search-field="definition.searchField ?? ''"
    :columns="definition.columns"
    :blank="blank"
    :from-item="fromItem"
    :query-columns="definition.queryColumns"
    :query-title="definition.queryTitle"
    :noun="definition.noun"
    :layout="definition.layout"
  >
    <template v-if="kind === 'banks'" #aside="{ current, editable }">
      <table class="legacy-check-layout" aria-label="支票列印位置設定">
        <thead>
          <tr>
            <th>支票列印位置設定</th>
            <th>X軸</th>
            <th>Y軸</th>
            <th>X軸</th>
            <th>Y軸</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="field in checkPrintFields" :key="field.key">
            <th>{{ field.label }}：</th>
            <td>
              <input
                v-model="current.check_layout.fields[field.key].layout1.x"
                class="num"
                :disabled="!editable"
                :aria-label="`${field.label} X 軸`"
              />
            </td>
            <td>
              <input
                v-model="current.check_layout.fields[field.key].layout1.y"
                class="num"
                :disabled="!editable"
                :aria-label="`${field.label} Y 軸`"
              />
            </td>
            <template v-if="field.second">
              <td>
                <input
                  v-model="current.check_layout.fields[field.key].layout2.x"
                  class="num"
                  :disabled="!editable"
                  :aria-label="`${field.label} 第二組 X 軸`"
                />
              </td>
              <td>
                <input
                  v-model="current.check_layout.fields[field.key].layout2.y"
                  class="num"
                  :disabled="!editable"
                  :aria-label="`${field.label} 第二組 Y 軸`"
                />
              </td>
            </template>
          </tr>
          <tr>
            <th>X軸修正：</th>
            <td>
              <input
                v-model="current.check_layout.corrections.x"
                class="num"
                :disabled="!editable"
                aria-label="X 軸修正"
              />
            </td>
          </tr>
          <tr>
            <th>Y軸修正：</th>
            <td>
              <input
                v-model="current.check_layout.corrections.y"
                class="num"
                :disabled="!editable"
                aria-label="Y 軸修正"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </LegacyMasterForm>
</template>
