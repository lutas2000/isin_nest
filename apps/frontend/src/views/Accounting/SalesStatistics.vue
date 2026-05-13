<template>
  <div class="mx-auto w-full">
    <CrmTableContainer
      :loading="loading"
      :error="error"
      :show-search="false"
      @retry="loadStatistics"
    >
      <template #controls>
        <div class="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
          <input v-model="yearMonth" type="month" class="form-control max-w-[160px] shrink-0" />
          <input
            v-model="customerInput"
            type="text"
            class="form-control max-w-[280px] shrink-0"
            list="accounting-sales-stats-voucher-customers"
            placeholder="輸入公司 ID 或名稱"
            @input="handleCustomerInput"
          />
          <datalist id="accounting-sales-stats-voucher-customers">
            <option value="">全部公司</option>
            <option
              v-for="option in customerOptions"
              :key="option.value"
              :value="option.display"
            />
          </datalist>
          <input
            v-model="notes"
            type="text"
            class="form-control max-w-[240px] shrink-0"
            placeholder="備註關鍵字"
          />
          <button
            type="button"
            class="btn btn-outline btn-sm shrink-0 whitespace-nowrap"
            @click="handleResetFilters"
          >
            重設
          </button>
        </div>
      </template>

      <EditableDataTable
        :columns="columns"
        :data="rows"
        :show-actions="false"
        :editable="false"
        :pagination="true"
        :current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        @update:page="handlePageChange"
        @update:page-size="handlePageSizeChange"
      >
        <template #cell-customerName="{ row }">
          {{ row.customerName || row.customerId }}
        </template>
        <template #cell-amount="{ value }">
          {{ formatMoney(value) }}
        </template>
        <template #cell-tax="{ value }">
          {{ value === null || value === undefined ? '—' : formatMoney(value) }}
        </template>
        <template #cell-totalAmount="{ value }">
          {{ value === null || value === undefined ? '—' : formatMoney(value) }}
        </template>
        <template #cell-createdAt="{ value }">
          {{ value ? new Date(value).toLocaleDateString('zh-TW') : '' }}
        </template>
      </EditableDataTable>
    </CrmTableContainer>
  </div>
</template>

<script setup lang="ts">
import {
  CrmTableContainer,
  EditableDataTable,
  type EditableColumn,
} from '@/components';
import { useSalesStatisticsList } from './useSalesStatisticsList';

const columns: EditableColumn[] = [
  { key: 'voucherId', label: '銷貨單號', editable: false },
  { key: 'customerName', label: '公司', editable: false },
  { key: 'notes', label: '備註', editable: false, truncate: true, width: 'notes' },
  { key: 'amount', label: '未稅合計', editable: false, width: 'long-number' },
  { key: 'tax', label: '稅額', editable: false, width: 'long-number' },
  { key: 'totalAmount', label: '含稅合計', editable: false, width: 'long-number' },
  { key: 'createdAt', label: '建立日期', editable: false },
];

const {
  loading,
  error,
  rows,
  total,
  currentPage,
  pageSize,
  yearMonth,
  customerInput,
  notes,
  customerOptions,
  loadStatistics,
  handleResetFilters,
  handlePageChange,
  handlePageSizeChange,
  handleCustomerInput,
  formatMoney,
} = useSalesStatisticsList({ view: 'voucher', includeNotesFilter: true });
</script>
