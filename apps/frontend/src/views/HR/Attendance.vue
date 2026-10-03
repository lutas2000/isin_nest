<template>
  <div class="overflow-hidden rounded-lg bg-white shadow">
    <TableHeader title="出勤記錄">
      <template #actions>
        <button class="btn btn-outline" :disabled="loading" @click="loadRecords">
          {{ loading ? '載入中…' : '重新整理' }}
        </button>
      </template>
    </TableHeader>
    <ErrorMessage v-if="error" :message="error" />
    <p v-if="loading" class="p-6 text-secondary-500">正在載入打卡記錄…</p>
    <EditableDataTable
      v-else-if="!error"
      :columns="columns"
      :data="records"
      :editable="false"
      :show-actions="false"
      :pagination="true"
      :current-page="page"
      :page-size="pageSize"
      :total="total"
      @update:page="changePage"
      @update:page-size="changePageSize"
    >
      <template #cell-createTime="{ value }">
        {{ value ? new Date(value).toLocaleString('zh-TW') : '—' }}
      </template>
      <template #cell-attendType="{ value }">
        {{ attendanceTypes[value] || '不明' }}
      </template>
    </EditableDataTable>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { EditableDataTable, TableHeader } from '@/components';
import ErrorMessage from '@/components/ErrorMessage.vue';
import { apiGet } from '@/services/api';
import type { PaginatedResponse } from '@/types/pagination';

interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName?: string;
  createTime: string;
  inputType?: string;
  attendType: number;
}

const records = ref<AttendanceRecord[]>([]);
const page = ref(1);
const pageSize = ref(50);
const total = ref(0);
const loading = ref(false);
const error = ref('');
const attendanceTypes: Record<number, string> = { 0: '新記錄', 1: '上班', 2: '下班', 3: '不明' };
const columns = [
  { key: 'staffId', label: '員工編號' },
  { key: 'staffName', label: '員工姓名' },
  { key: 'createTime', label: '打卡時間' },
  { key: 'attendType', label: '出勤類型' },
  { key: 'inputType', label: '打卡方式' },
];

let requestId = 0;
async function loadRecords() {
  const currentRequest = ++requestId;
  loading.value = true;
  error.value = '';
  try {
    const result = await apiGet<PaginatedResponse<AttendanceRecord>>('/attend-record', { page: page.value, limit: pageSize.value });
    if (!Array.isArray(result.data) || !Number.isFinite(result.total)) throw new Error('出勤資料格式不正確');
    if (currentRequest !== requestId) return;
    records.value = result.data;
    total.value = result.total;
  } catch (err) {
    if (currentRequest !== requestId) return;
    records.value = [];
    total.value = 0;
    error.value = err instanceof Error ? err.message : '載入出勤記錄失敗';
  } finally {
    if (currentRequest === requestId) loading.value = false;
  }
}
function changePage(value: number) {
  page.value = value;
  loadRecords();
}
function changePageSize(value: number) {
  pageSize.value = value;
  page.value = 1;
  loadRecords();
}
onMounted(loadRecords);
</script>
