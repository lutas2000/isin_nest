<template>
  <div class="search-filters">
    <div class="content-header">
      <h3>{{ title }}</h3>
      <div class="header-controls">
        <div class="search-box" v-if="showSearch">
          <input 
            type="text" 
            class="form-control" 
            :placeholder="searchPlaceholder"
            v-model="searchValue"
            @input="$emit('update:search', $event.target.value)"
          />
        </div>
        
        <select 
          v-for="filter in filters" 
          :key="filter.key"
          class="form-control" 
          v-model="filterValues[filter.key]"
          @change="$emit('update:filter', filter.key, $event.target.value)"
        >
          <option value="">{{ filter.placeholder }}</option>
          <option 
            v-for="option in filter.options" 
            :key="option.value" 
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        
        <input 
          v-if="showDateFilter"
          type="date" 
          class="form-control" 
          v-model="dateValue"
          @change="$emit('update:date', $event.target.value)"
        />
        
        <slot name="controls"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface FilterOption {
  value: string;
  label: string;
}

interface Filter {
  key: string;
  placeholder: string;
  options: FilterOption[];
}

interface Props {
  title: string;
  showSearch?: boolean;
  searchPlaceholder?: string;
  filters?: Filter[];
  showDateFilter?: boolean;
  search?: string;
  date?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showSearch: true,
  searchPlaceholder: '搜尋...',
  filters: () => [],
  showDateFilter: false,
  search: '',
  date: ''
});

const emit = defineEmits<{
  'update:search': [value: string];
  'update:filter': [key: string, value: string];
  'update:date': [value: string];
}>();

const searchValue = ref(props.search);
const dateValue = ref(props.date);
const filterValues = ref<Record<string, string>>({});

// 監聽 props 變化
watch(() => props.search, (newValue) => {
  searchValue.value = newValue;
});

watch(() => props.date, (newValue) => {
  dateValue.value = newValue;
});
</script>

<style scoped>
.search-filters {
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
}

.content-header {
  padding: 2rem 2rem 1rem 2rem;
  border-bottom: 1px solid var(--secondary-200);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.content-header h3 {
  margin: 0;
  color: var(--secondary-900);
}

.header-controls {
  display: flex;
  gap: 1rem;
}

.search-box {
  min-width: 300px;
}

.form-control {
  padding: 0.75rem;
  border: 1px solid var(--secondary-300);
  border-radius: var(--border-radius);
  font-size: var(--font-size-base);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px var(--primary-100);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .content-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .header-controls {
    width: 100%;
    flex-direction: column;
  }
  
  .search-box {
    min-width: auto;
  }
}
</style>
