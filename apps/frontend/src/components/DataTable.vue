<template>
  <div class="overflow-hidden rounded-lg bg-white shadow">
    <div class="overflow-x-auto text-sm md:text-sm">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              class="border-b border-secondary-200 bg-secondary-50 px-4 py-4 text-left text-sm font-semibold uppercase tracking-wider text-secondary-700 md:px-2 md:py-2"
            >
              {{ column.label }}
            </th>
            <th
              v-if="showActions"
              class="border-b border-secondary-200 bg-secondary-50 px-4 py-4 text-left text-sm font-semibold uppercase tracking-wider text-secondary-700 md:px-2 md:py-2"
            >
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in data"
            :key="getRowKey(row, index)"
            class="hover:bg-secondary-50"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              class="border-b border-secondary-200 px-4 py-4 text-left md:px-2 md:py-2"
            >
              <slot 
                :name="`cell-${column.key}`" 
                :row="row" 
                :value="row[column.key]"
                :column="column"
              >
                {{ row[column.key] }}
              </slot>
            </td>
            <td v-if="showActions" class="border-b border-secondary-200 px-4 py-4 text-left md:px-2 md:py-2">
              <div class="flex gap-2 md:flex-col md:gap-1">
                <slot name="actions" :row="row" :index="index">
                  <button class="btn btn-sm btn-outline">查看詳情</button>
                  <button class="btn btn-sm btn-primary">編輯</button>
                </slot>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- 分頁控制 -->
    <div
      v-if="pagination"
      class="flex flex-wrap items-center justify-between gap-4 border-t border-secondary-200 bg-secondary-50 p-4 md:flex-col md:items-stretch"
    >
      <div class="text-sm text-secondary-600">
        顯示第 {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, total) }} 筆，共 {{ total }} 筆
      </div>
      <div class="flex items-center gap-2 md:flex-wrap md:justify-center">
        <select
          v-model="localPageSize"
          @change="handlePageSizeChange"
          class="cursor-pointer rounded border border-secondary-300 bg-white px-3 py-1.5 text-sm"
        >
          <option :value="25">25 筆/頁</option>
          <option :value="50">50 筆/頁</option>
          <option :value="100">100 筆/頁</option>
        </select>
        <button 
          class="btn btn-sm btn-outline" 
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
        >
          上一頁
        </button>
        <span class="px-2 text-sm text-secondary-600">
          第 {{ currentPage }} / {{ totalPages }} 頁
        </span>
        <button 
          class="btn btn-sm btn-outline" 
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
        >
          下一頁
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
}

interface Props {
  columns: Column[];
  data: any[];
  showActions?: boolean;
  rowKey?: string;
  pagination?: boolean;
  currentPage?: number;
  pageSize?: number;
  total?: number;
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true,
  rowKey: 'id',
  pagination: false,
  currentPage: 1,
  pageSize: 50,
  total: 0,
});

const emit = defineEmits<{
  'update:page': [page: number];
  'update:page-size': [pageSize: number];
}>();

const localPageSize = ref(props.pageSize);

const totalPages = computed(() => {
  return Math.ceil(props.total / props.pageSize);
});

const getRowKey = (row: any, index: number) => {
  return row[props.rowKey] || index;
};

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    emit('update:page', page);
  }
};

const handlePageSizeChange = () => {
  emit('update:page-size', localPageSize.value);
  // 重置到第一頁
  emit('update:page', 1);
};

watch(() => props.pageSize, (newSize) => {
  localPageSize.value = newSize;
});
</script>
