<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import LegacyAssistHost from './LegacyAssistHost.vue';
import LegacyPreviewWindow from './LegacyPreviewWindow.vue';
import LegacyReportSheet from './LegacyReportSheet.vue';
import LegacySelectionWindow from './LegacySelectionWindow.vue';
import { legacyGet, queryString } from '../services/legacyApi';
import { logLegacyPrint } from '../services/legacyPrintLog';
import { formatRocDate } from '../utils/reportDates';
import { canPrintReport } from '../utils/reportPrinting';
import { useLegacyAssist } from '../utils/legacyAssist';
import {
  legacyReportDialogs,
  type ReportDialog,
  type ReportDialogField,
} from '../utils/legacyReportDialogs';
import { companyProfile } from '../utils/companyProfile';
import { buildLegacyPages, type ReportResult } from '../utils/legacyPaper';
import { useCloseWindow } from '../utils/legacyWindow';
import { ASSIST_HINT } from '../utils/statusHints';

// 報表列印 dialogs and their 資料列印 preview (isin_vb6
// src/components/ReportsView.vue). Every preview is logged by the backend
// (report_query); 印出 O logs report_print, or statement_print for the
// 請款單 (LEGACY-CRM-REBUILD-PLAN.md 2.5). Reports only read, so a user with
// `crm` read only can use all of it.
const props = defineProps({
  title: { type: String, required: true },
  group: { type: String, required: true },
});

interface CatalogReport {
  key: string;
  title: string;
  available: boolean;
}
interface SelectionState {
  token: number;
  criteria: string;
  rows: Record<string, any>[];
  loading: boolean;
  error: string;
  initial: Set<unknown> | null;
}

const INVOICES = ['invoice-brief', 'invoice-detail'];

const reports = ref<CatalogReport[]>([]);
const selectedKey = ref('');
const filters = ref<Record<string, string>>({});
const result = ref<ReportResult | null>(null);
const isLoading = ref(false);
const errorMessage = ref('');
const statusMessage = ref('');
const assist = useLegacyAssist();
const selectedReport = computed(() =>
  reports.value.find((report) => report.key === selectedKey.value),
);
const isInvoice = computed(() =>
  INVOICES.includes(selectedReport.value?.key ?? ''),
);
const dialog = computed<ReportDialog>(
  () =>
    legacyReportDialogs[props.group] ?? {
      title: props.title,
      columns: [[]],
      labels: {},
      fields: [],
    },
);
const dialogReports = computed(() => dialog.value.columns.flat());
const paperTitle = computed(
  () =>
    dialog.value.labels[selectedKey.value] ?? selectedReport.value?.title ?? '',
);
const previewOpen = ref(false);
const previewZoom = ref(1);
const canPrint = computed(() =>
  canPrintReport(selectedReport.value?.key, result.value),
);
const printDate = ref(formatRocDate(new Date()));
const previewPage = ref(0);
// 選項: the rows chosen in the selection window, kept for the criteria they
// were chosen under ({criteria, keys}).
const selection = ref<{ criteria: string; keys: Set<unknown> } | null>(null);
const selectionWindow = ref<SelectionState | null>(null);
let selectionToken = 0;
const pages = computed(() =>
  result.value
    ? buildLegacyPages(selectedKey.value, result.value, {
        company: companyProfile.name,
        profile: companyProfile,
        printDate: printDate.value,
        filters: filters.value,
      })
    : [],
);

// Like the legacy dialogs, date fields start at today and the rest are blank.
function legacyDefaultFilters(): Record<string, string> {
  const today = formatRocDate(new Date());
  return Object.fromEntries(
    dialog.value.fields
      .flat()
      .map((field) => [field.key, field.date ? today : '']),
  );
}

async function loadCatalog() {
  selectedKey.value = dialogReports.value[0] ?? '';
  filters.value = legacyDefaultFilters();
  try {
    const payload = await legacyGet<{ items: CatalogReport[] }>(
      `/reports/catalog?group=${encodeURIComponent(props.group)}`,
    );
    reports.value = payload.items;
  } catch (error) {
    errorMessage.value = (error as Error).message;
  }
}

function selectReportKey(key: string) {
  selectedKey.value = key;
  result.value = null;
  errorMessage.value = '';
  statusMessage.value = '';
}

// 關閉 closes the dialog window, as in the legacy program.
const closeWindow = useCloseWindow();

function closeDialog() {
  resetDialog();
  closeWindow();
}

function resetDialog() {
  assist.close();
  previewOpen.value = false;
  selection.value = null;
  selectionWindow.value = null;
  filters.value = legacyDefaultFilters();
  result.value = null;
  errorMessage.value = '';
  statusMessage.value = '';
}

// F1 opens the legacy 輔助輸入 window for the field's master file, starting
// from what is typed; a part list follows the dialog's customer.
function openFieldLookup(field: ReportDialogField) {
  const lookup = field.lookup;
  if (!lookup) return;
  void assist.open(lookup, {
    prefix: filters.value[field.key],
    customer: lookup === 'part' ? (filters.value.customer_code ?? '') : '',
    order: 'asc',
    onSelect: (row) => {
      filters.value[field.key] = lookup === 'part' ? row.drawing_no : row.code;
      result.value = null;
      statusMessage.value = '';
    },
  });
}

// The legacy 確定 button opens the 資料列印 window straight away.
async function previewReport() {
  errorMessage.value = '';
  statusMessage.value = '';
  if (!selectedReport.value?.available) {
    errorMessage.value = '此報表的資料規則尚未核實，暫時無法列印。';
    return;
  }
  isLoading.value = true;
  try {
    const payload = await legacyGet<ReportResult>(
      reportUrl(selectedReport.value.key),
    );
    result.value = applySelection(payload);
    printDate.value = formatRocDate(new Date());
    previewZoom.value = 1;
    previewPage.value = 0;
    if (isInvoice.value && !result.value.pages?.length) {
      statusMessage.value = '沒有符合條件的未收帳款。';
      return;
    }
    previewOpen.value = true;
  } catch (error) {
    result.value = null;
    errorMessage.value = (error as Error).message;
  } finally {
    isLoading.value = false;
  }
}

function criteria(): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of dialog.value.fields.flat()) {
    const value = String(filters.value[field.key] ?? '').trim();
    if (value) values[field.key] = value;
  }
  return values;
}

function criteriaQuery() {
  return new URLSearchParams(criteria()).toString();
}

function reportUrl(key: string) {
  return `/reports/${encodeURIComponent(key)}/preview${queryString(new URLSearchParams(criteria()))}`;
}

// Like the legacy program, only rows still marked ＊ print. A selection made
// under different criteria no longer applies.
function applySelection(payload: ReportResult): ReportResult {
  const options = dialog.value.options;
  const chosen = selection.value;
  if (!options || !chosen || chosen.criteria !== criteriaQuery())
    return payload;
  const items = payload.items.filter((item) =>
    chosen.keys.has(item[options.key]),
  );
  return { ...payload, items, count: items.length };
}

async function openSelection() {
  const options = dialog.value.options;
  if (!options || !selectedReport.value) return;
  const query = criteriaQuery();
  const token = ++selectionToken;
  const state: SelectionState = {
    token,
    criteria: query,
    rows: [],
    loading: true,
    error: '',
    initial: selection.value?.criteria === query ? selection.value.keys : null,
  };
  selectionWindow.value = state;
  try {
    const payload = await legacyGet<ReportResult>(
      reportUrl(selectedReport.value.key),
    );
    if (selectionWindow.value?.token === token)
      selectionWindow.value = { ...state, rows: payload.items, loading: false };
  } catch (error) {
    if (selectionWindow.value?.token === token)
      selectionWindow.value = {
        ...state,
        loading: false,
        error: (error as Error).message,
      };
  }
}

function confirmSelection(keys: Set<unknown>) {
  if (!selectionWindow.value) return;
  selection.value = { criteria: selectionWindow.value.criteria, keys };
  selectionWindow.value = null;
}

async function printReport() {
  if (!canPrint.value || !result.value) return;
  printDate.value = formatRocDate(new Date());
  await nextTick();
  logLegacyPrint({
    kind: isInvoice.value ? 'statement_print' : 'report_print',
    target: paperTitle.value || selectedKey.value,
    criteria: { report: selectedKey.value, ...criteria() },
    // 請款單 counts its sales, as the backend's report_query does.
    row_count: isInvoice.value
      ? (result.value.pages ?? []).reduce(
          (count, customer) => count + (customer.sales?.length ?? 0),
          0,
        )
      : result.value.items.length,
    page_count: pages.value.length,
  });
  window.print();
}

onMounted(loadCatalog);
</script>

<template>
  <div class="reports-page">
    <form
      class="legacy-dialog"
      :aria-label="dialog.title"
      @submit.prevent="previewReport"
    >
      <div class="legacy-dialog-title">{{ dialog.title }}</div>
      <div class="legacy-dialog-body">
        <div class="legacy-dialog-main">
          <fieldset v-if="dialogReports.length > 1" class="legacy-groupbox">
            <legend>報表種類</legend>
            <div class="legacy-radio-columns">
              <div
                v-for="(column, columnIndex) in dialog.columns"
                :key="columnIndex"
              >
                <label v-for="key in column" :key="key" class="legacy-radio">
                  <input
                    v-model="selectedKey"
                    type="radio"
                    name="legacy-report-kind"
                    :value="key"
                    @change="selectReportKey(key)"
                  />
                  <span>{{ dialog.labels[key] }}</span>
                </label>
              </div>
            </div>
          </fieldset>
          <div class="legacy-field-columns">
            <div
              v-for="(column, columnIndex) in dialog.fields"
              :key="columnIndex"
            >
              <label
                v-for="field in column"
                :key="field.key"
                class="legacy-field"
              >
                <span>{{ field.label }}：</span>
                <input
                  v-model="filters[field.key]"
                  type="text"
                  maxlength="20"
                  :data-hint="
                    field.hint ?? (field.date ? undefined : ASSIST_HINT)
                  "
                  @input="result = null"
                  @keydown.f1.prevent="openFieldLookup(field)"
                />
              </label>
            </div>
          </div>
        </div>
        <div class="legacy-dialog-buttons">
          <button type="submit" :disabled="isLoading">確　定</button>
          <button type="button" @click="closeDialog">關　閉</button>
          <button
            v-if="dialog.options"
            type="button"
            :disabled="isLoading"
            @click="openSelection"
          >
            選　項
          </button>
        </div>
      </div>
    </form>
    <p
      v-if="errorMessage || statusMessage"
      class="legacy-statusbar"
      :class="{ error: errorMessage }"
      role="status"
    >
      {{ errorMessage || statusMessage }}
    </p>

    <LegacyPreviewWindow
      v-if="previewOpen && result"
      v-model:page="previewPage"
      v-model:zoom="previewZoom"
      :label="paperTitle"
      :page-count="pages.length"
      :printable="canPrint"
      @print="printReport"
      @close="previewOpen = false"
    >
      <LegacyReportSheet v-if="pages[previewPage]" :page="pages[previewPage]" />
      <p v-if="result.truncated" class="legacy-report-truncated">
        資料超過 {{ (result.limit ?? 0).toLocaleString() }} 筆上限，請縮小條件。
      </p>
    </LegacyPreviewWindow>

    <section
      v-if="previewOpen && canPrint"
      class="legacy-print-pages"
      aria-hidden="true"
    >
      <LegacyReportSheet
        v-for="(page, index) in pages"
        :key="index"
        :page="page"
      />
    </section>

    <LegacySelectionWindow
      v-if="selectionWindow && dialog.options"
      :title="`${dialog.title}選擇`"
      :columns="dialog.options.columns"
      :row-key="dialog.options.key"
      :rows="selectionWindow.rows"
      :loading="selectionWindow.loading"
      :error="selectionWindow.error"
      :initial="selectionWindow.initial"
      @confirm="confirmSelection"
      @cancel="selectionWindow = null"
    />

    <LegacyAssistHost :assist="assist" />
  </div>
</template>
