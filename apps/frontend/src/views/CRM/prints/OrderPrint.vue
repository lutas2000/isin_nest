<template>
  <PrintContainer ref="printContainerRef">
    <CompanyHeader
      company-name="奕新雷射精機股份有限公司"
      address="台中市東區東光園路310號"
      phone="04-22130117"
      fax="04-22130113"
      document-title="訂貨單"
    />

    <!-- 訂單資訊 -->
    <div class="print-order-info">
      <div class="order-info-left">
        <div class="info-row">
          <span class="info-label">公司名稱：</span>
          <span class="info-value">
            {{ customerName }}
          </span>
        </div>
        <div class="info-row" v-if="shippingMethod">
          <span class="info-label">送貨方式：</span>
          <span class="info-value">{{ shippingMethod }}</span>
        </div>
        <div class="info-row" v-if="paymentMethod">
          <span class="info-label">付款方式：</span>
          <span class="info-value">{{ paymentMethod }}</span>
        </div>
      </div>
      <div class="order-info-right">
        <div class="info-row">
          <span class="info-label">訂單編號：</span>
          <span class="info-value">{{ orderId }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">日期：</span>
          <span class="info-value">{{ orderDate }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">業務：</span>
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
            <th class="col-cad-file">CAD 檔案</th>
            <th class="col-customer-file">客戶型號</th>
            <th class="col-material">材質</th>
            <th class="col-thickness">厚度</th>
            <th class="col-processing">加工</th>
            <th class="col-source">來源</th>
            <th class="col-quantity">數量</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in items" :key="item.id">
            <td class="col-item">{{ index + 1 }}</td>
            <td class="col-cad-file">{{ item.cadFile || '-' }}</td>
            <td class="col-customer-file">{{ item.customerFile || '-' }}</td>
            <td class="col-material">{{ item.material || '-' }}</td>
            <td class="col-thickness">{{ item.thickness || '-' }}</td>
            <td class="col-processing">
              {{ getProcessingNames(item.processingIds) }}
            </td>
            <td class="col-source">{{ item.source || '-' }}</td>
            <td class="col-quantity text-right">
              {{ formatInteger(item.quantity) }}
            </td>
          </tr>
        </tbody>
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
import { getCompanyHeaderStyles } from '@/components/Print/printStyles';
import { formatRocDate, formatInteger } from '@/utils/formatters';
import {
  processingService,
  type Processing,
} from '@/services/crm/processing.service';
import type {
  WorkOrder,
  WorkOrderItem,
} from '@/services/crm/work-order.service';

interface Props {
  workOrder: WorkOrder;
  items: WorkOrderItem[];
}

const props = defineProps<Props>();

const printContainerRef =
  ref<InstanceType<typeof PrintContainer> | null>(null);

const allProcessings = ref<Processing[]>([]);

// 計算屬性
const customerName = computed(
  () =>
    props.workOrder.customer?.companyName ||
    props.workOrder.customer?.companyShortName ||
    '未指定',
);

const shippingMethod = computed(() => props.workOrder.shippingMethod);
const paymentMethod = computed(() => props.workOrder.paymentMethod);

const orderId = computed(() => props.workOrder.id);
const orderDate = computed(() => formatRocDate(props.workOrder.createdAt));
const handler = computed(() => props.workOrder.staff?.name || '未知');
const totalAmount = computed(() => props.workOrder.amount || 0);
const notes = computed(() => props.workOrder.notes);

// 取得加工名稱列表
const getProcessingNames = (processingIds?: number[]) => {
  if (!processingIds || processingIds.length === 0) return '-';
  return processingIds
    .map(
      (id) => allProcessings.value.find((p) => p.id === id)?.name || `ID:${id}`,
    )
    .join('、');
};

// 載入所有加工項目
const loadAllProcessings = async () => {
  try {
    const response = await processingService.getAllActive();
    allProcessings.value = response;
  } catch (err) {
    console.error('載入加工項目失敗:', err);
  }
};

// 取得訂單列印樣式
const getOrderPrintStyles = (): string => {
  return `
    ${getCompanyHeaderStyles()}
    
    .print-order-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      font-size: 11pt;
    }
    
    .order-info-left,
    .order-info-right {
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
      width: 7%;
    }
    
    .col-cad-file {
      width: 14%;
    }
    
    .col-customer-file {
      width: 14%;
    }
    
    .col-material {
      width: 12%;
    }
    
    .col-thickness {
      width: 8%;
    }
    
    .col-processing {
      width: 14%;
    }
    
    .col-source {
      width: 10%;
    }
    
    .col-quantity {
      width: 8%;
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
    title: `訂單 - ${props.workOrder.id}`,
    styles: getOrderPrintStyles(),
  });
};

loadAllProcessings();

defineExpose({ print });
</script>

<style scoped>
/* 訂單特定的列印樣式 */
.print-order-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  font-size: 11pt;
}

.order-info-left,
.order-info-right {
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
  width: 19%;
}
.col-quantity {
  width: 8%;
}
.col-unit-price {
  width: 10%;
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
</style>

