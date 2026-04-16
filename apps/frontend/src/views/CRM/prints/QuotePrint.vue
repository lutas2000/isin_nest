<template>
  <PrintContainer ref="printContainerRef">
    <CompanyHeader
      company-name="奕新雷射精機股份有限公司"
      address="台中市東區東光園路310號"
      phone="04-22130117"
      fax="04-22130113"
      document-title="估價單"
    />

    <!-- 報價單資訊 -->
    <div class="print-quote-info">
      <div class="quote-info-left">
        <div class="info-row">
          <span class="info-label">客戶名稱：</span>
          <span class="info-value">
            {{ customerName }}
          </span>
        </div>
        <div class="info-row" v-if="attention">
          <span class="info-label">ATTENTION:</span>
          <span class="info-value">{{ attention }}</span>
        </div>
        <div class="info-row" v-if="phone">
          <span class="info-label">聯絡電話：</span>
          <span class="info-value">{{ phone }}</span>
        </div>
        <div class="info-row" v-if="fax">
          <span class="info-label">傳真號碼：</span>
          <span class="info-value">{{ fax }}</span>
        </div>
      </div>
      <div class="quote-info-right">
        <div class="info-row">
          <span class="info-label">報價編號：</span>
          <span class="info-value">{{ quoteId }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">日期：</span>
          <span class="info-value">{{ quoteDate }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">經手人：</span>
          <span class="info-value">{{ handler }}</span>
        </div>
      </div>
    </div>

    <!-- 表格 -->
    <div class="print-table-container">
      <table class="print-table">
        <thead>
          <tr>
            <th class="col-item">項次</th>
            <th class="col-customer-file">客戶型號</th>
            <th class="col-material">材質</th>
            <th class="col-thickness">厚度</th>
            <th class="col-summary">摘要</th>
            <th class="col-quantity">數量</th>
            <th class="col-unit-price">單價</th>
            <th class="col-amount">金額</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in items" :key="item.id">
            <td class="col-item">{{ index + 1 }}</td>
            <td class="col-customer-file">{{ item.customerFile || '-' }}</td>
            <td class="col-material">{{ item.material || '-' }}</td>
            <td class="col-thickness">{{ item.thickness || '-' }}</td>
            <td class="col-summary">{{ item.notes || '-' }}</td>
            <td class="col-quantity text-right">{{ formatInteger(item.quantity) }}</td>
            <td class="col-unit-price text-right">{{ formatInteger(item.unitPrice) }}</td>
            <td class="col-amount text-right">
              {{ formatInteger((item.quantity || 0) * (item.unitPrice || 0)) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="7" class="text-right total-label">合計</td>
            <td class="text-right total-amount">{{ formatInteger(totalAmount) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- 備註 -->
    <div class="print-notes" v-if="printNotes">
      <div class="notes-title">備註</div>
      <div class="notes-content">{{ printNotes }}</div>
    </div>
  </PrintContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import PrintContainer from '@/components/Print/PrintContainer.vue';
import CompanyHeader from '@/components/Print/CompanyHeader.vue';
import { getCompanyHeaderStyles } from '@/components/Print/printStyles';
import { formatRocDate, formatInteger } from '@/utils/formatters';
import type { PrintOptions } from '@/utils/print';
import type { Quote, QuoteItem } from '@/services/crm/quote.service';

interface Props {
  quote: Quote;
  items: QuoteItem[];
}

const props = defineProps<Props>();

const printContainerRef = ref<InstanceType<typeof PrintContainer> | null>(null);
type QuotePrintPageSize = Extract<NonNullable<PrintOptions['pageSize']>, 'A4' | 'A5'>;

// 計算屬性
const customerName = computed(() => 
  props.quote.customer?.companyName || 
  props.quote.customer?.companyShortName || 
  '未指定'
);

const attention = computed(() => 
  props.quote.customer?.contacts?.[0]?.name
);

const phone = computed(() => 
  props.quote.customer?.phones?.[0]
);

const fax = computed(() => 
  props.quote.customer?.fax
);

const quoteId = computed(() => props.quote.id);
const quoteDate = computed(() => formatRocDate(props.quote.createdAt));
const handler = computed(() => props.quote.staff?.name || '未知');
const totalAmount = computed(() => props.quote.totalAmount);

const formatQuoteDeadline = (value?: string) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.replace(/-/g, '/');
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }
  return parsedDate.toLocaleDateString('zh-TW');
};

const printNotes = computed(() => {
  const lines: string[] = [];

  if (props.quote.notes?.trim()) {
    lines.push(props.quote.notes.trim());
  }

  lines.push(`代料：${props.quote.isSupplyMaterial ? '是' : '否'}`);

  if (props.quote.quoteDeadline) {
    lines.push(`報價期限：${formatQuoteDeadline(props.quote.quoteDeadline)}`);
  }

  return lines.join('\n');
});

// 取得報價單列印樣式
const getQuotePrintStyles = (pageSize: QuotePrintPageSize = 'A4'): string => {
  const isA5 = pageSize === 'A5';
  const infoFontSize = isA5 ? '9pt' : '11pt';
  const tableFontSize = isA5 ? '8pt' : '10pt';
  const notesFontSize = isA5 ? '8pt' : '10pt';
  const rowSpacing = isA5 ? '3px' : '5px';
  const cellPadding = isA5 ? '3px' : '5px';
  const sectionSpacing = isA5 ? '12px' : '20px';
  return `
    ${getCompanyHeaderStyles()}
    
    .print-quote-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: ${sectionSpacing};
      font-size: ${infoFontSize};
      gap: ${isA5 ? '12px' : '20px'};
    }
    
    .quote-info-left,
    .quote-info-right {
      flex: 1;
    }
    
    .info-row {
      margin-bottom: ${rowSpacing};
    }
    
    .info-label {
      font-weight: 500;
    }
    
    .info-value {
      margin-left: 5px;
    }
    
    .print-table-container {
      margin-bottom: ${sectionSpacing};
    }
    
    .print-table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${tableFontSize};
      table-layout: fixed;
    }
    
    .print-table th,
    .print-table td {
      border: 1px solid #000;
      padding: ${cellPadding};
      text-align: left;
      word-break: break-word;
    }
    
    .print-table th {
      background-color: #f0f0f0;
      font-weight: bold;
      text-align: center;
    }
    
    .print-table td {
      vertical-align: top;
    }
    
    .text-right {
      text-align: right;
    }
    
    .col-item {
      width: 7%;
    }
    
    .col-customer-file {
      width: 15%;
    }
    
    .col-material {
      width: 12%;
    }
    
    .col-thickness {
      width: 8%;
    }
    
    .col-summary {
      width: 19%;
    }
    
    .col-quantity {
      width: 8%;
    }
    
    .col-unit-price {
      width: 8%;
    }
    
    .col-amount {
      width: 13%;
    }
    
    .total-label {
      font-weight: bold;
      text-align: right;
      padding-right: 10px;
    }
    
    .total-amount {
      font-weight: bold;
    }
    
    .print-notes {
      margin-top: ${sectionSpacing};
      font-size: ${notesFontSize};
    }
    
    .notes-title {
      font-weight: bold;
      margin-bottom: ${isA5 ? '6px' : '10px'};
    }
    
    .notes-content {
      white-space: pre-line;
      line-height: 1.8;
    }
  `;
};

// 暴露列印方法
const print = (pageSize: QuotePrintPageSize = 'A4') => {
  printContainerRef.value?.print({
    title: `報價單 ${pageSize} - ${props.quote.id}`,
    styles: getQuotePrintStyles(pageSize),
    pageSize,
  });
};

defineExpose({ print });
</script>

<style scoped src="@/components/Print/print-common.css"></style>
