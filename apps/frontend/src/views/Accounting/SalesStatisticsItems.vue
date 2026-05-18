<template>
  <div class="mx-auto w-full">
    <CrmTableContainer
      :loading="loading"
      :error="error"
      :show-search="false"
      @retry="loadStatistics"
    >
      <template #controls>
        <div class="flex flex-wrap items-center gap-2">
          <input v-model="yearMonth" type="month" class="form-control max-w-[160px]" />
          <input
            v-model="customerInput"
            type="text"
            class="form-control max-w-[280px]"
            list="accounting-sales-stats-item-customers"
            placeholder="輸入公司 ID 或名稱"
            @input="handleCustomerInput"
          />
          <datalist id="accounting-sales-stats-item-customers">
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
            class="form-control max-w-[240px]"
            placeholder="備註關鍵字"
          />
          <button type="button" class="btn btn-outline btn-sm" @click="handleResetFilters">
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
        <template #cell-drawingNumber="{ value }">
          {{ value ? String(value) : '—' }}
        </template>
        <template #cell-customerFile="{ value }">
          {{ value ? String(value) : '—' }}
        </template>
        <template #cell-material="{ value }">
          {{ value ? String(value) : '—' }}
        </template>
        <template #cell-thickness="{ value }">
          {{ value === null || value === undefined ? '—' : value }}
        </template>
        <template #cell-quantity="{ value }">
          {{ value === null || value === undefined ? '—' : value }}
        </template>
        <template #cell-unit="{ value }">
          {{ value ? String(value) : '—' }}
        </template>
        <template #cell-amount="{ value }">
          {{ formatMoney(value) }}
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
  { key: 'drawingNumber', label: '電腦圖號', editable: false, truncate: true, width: 'notes' },
  { key: 'customerFile', label: '客戶型號', editable: false, truncate: true, width: 'notes' },
  { key: 'material', label: '材質', editable: false },
  { key: 'thickness', label: '厚度', editable: false, width: 'short-number' },
  { key: 'quantity', label: '數量', editable: false, width: 'short-number' },
  { key: 'unit', label: '單位', editable: false },
  { key: 'amount', label: '金額', editable: false, width: 'long-number' },
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
} = useSalesStatisticsList({ view: 'item', includeNotesFilter: true });
</script>
