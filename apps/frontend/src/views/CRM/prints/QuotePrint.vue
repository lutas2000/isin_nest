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
            <td class="col-unit-price text-right">{{ formatNumber(item.unitPrice) }}</td>
            <td class="col-amount text-right">
              {{ formatNumber((item.quantity || 0) * (item.unitPrice || 0)) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="7" class="text-right total-label">合計</td>
            <td class="text-right total-amount">{{ formatNumber(totalAmount) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- 備註 -->
    <div class="print-notes" v-if="notes">
      <div class="notes-title">備註</div>
      <div class="notes-content">{{ notes }}</div>
    </div>
  </PrintContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import PrintContainer from '@/components/Print/PrintContainer.vue';
import CompanyHeader from '@/components/Print/CompanyHeader.vue';
import { getCompanyHeaderStyles } from '@/components/Print/CompanyHeader.vue';
import { formatRocDate, formatNumber, formatInteger } from '@/utils/formatters';
import type { Quote, QuoteItem } from '@/services/crm/quote.service';

interface Props {
  quote: Quote;
  items: QuoteItem[];
}

const props = defineProps<Props>();

const printContainerRef = ref<InstanceType<typeof PrintContainer> | null>(null);

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
const notes = computed(() => props.quote.notes);

// 取得報價單列印樣式
const getQuotePrintStyles = (): string => {
  return `
    ${getCompanyHeaderStyles()}
    
    .print-quote-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      font-size: 11pt;
    }
    
    .quote-info-left,
    .quote-info-right {
      flex: 1;
    }
    
    .info-row {
      margin-bottom: 5px;
    }
    
    .info-label {
      font-weight: 500;
    }
    
    .info-value {
      margin-left: 5px;
    }
    
    .print-table-container {
      margin-bottom: 20px;
    }
    
    .print-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }
    
    .print-table th,
    .print-table td {
      border: 1px solid #000;
      padding: 5px;
      text-align: left;
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
      width: 5%;
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
      width: 15%;
    }
    
    .col-quantity {
      width: 10%;
    }
    
    .col-unit-price {
      width: 12%;
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
      margin-top: 20px;
      font-size: 10pt;
    }
    
    .notes-title {
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .notes-content {
      white-space: pre-line;
      line-height: 1.8;
    }
  `;
};

// 暴露列印方法
const print = () => {
  printContainerRef.value?.print({
    title: `報價單 - ${props.quote.id}`,
    styles: getQuotePrintStyles(),
  });
};

defineExpose({ print });
</script>

<style scoped>
/* 報價單特定的列印樣式 */
.print-quote-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  font-size: 11pt;
}

.quote-info-left,
.quote-info-right {
  flex: 1;
}

.info-row {
  margin-bottom: 5px;
}

.info-label {
  font-weight: 500;
}

.info-value {
  margin-left: 5px;
}

.print-table-container {
  margin-bottom: 20px;
}

.print-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10pt;
}

.print-table th,
.print-table td {
  border: 1px solid #000;
  padding: 5px;
  text-align: left;
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

.col-item { width: 5%; }
.col-customer-file { width: 15%; }
.col-material { width: 12%; }
.col-thickness { width: 8%; }
.col-summary { width: 15%; }
.col-quantity { width: 10%; }
.col-unit-price { width: 12%; }
.col-amount { width: 13%; }

.total-label {
  font-weight: bold;
  text-align: right;
  padding-right: 10px;
}

.total-amount {
  font-weight: bold;
}

.print-notes {
  margin-top: 20px;
  font-size: 10pt;
}

.notes-title {
  font-weight: bold;
  margin-bottom: 10px;
}

.notes-content {
  white-space: pre-line;
  line-height: 1.8;
}
</style>
