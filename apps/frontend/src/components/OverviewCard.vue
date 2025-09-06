<template>
  <div class="overview-card" :class="cardClass">
    <div class="overview-icon">{{ icon }}</div>
    <div class="overview-content">
      <div class="overview-value">{{ value }}</div>
      <div class="overview-label">{{ label }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  icon: string;
  value: string | number;
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default'
});

const cardClass = computed(() => {
  return `overview-card-${props.variant}`;
});
</script>

<style scoped>
.overview-card {
  background: white;
  padding: 1.5rem;
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.overview-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.overview-content {
  flex: 1;
}

.overview-value {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--secondary-900);
  margin-bottom: 0.25rem;
}

.overview-label {
  font-size: var(--font-size-sm);
  color: var(--secondary-600);
}

/* 變體樣式 */
.overview-card-primary {
  border-left: 4px solid var(--primary-500);
}

.overview-card-success {
  border-left: 4px solid var(--success-500);
}

.overview-card-warning {
  border-left: 4px solid var(--warning-500);
}

.overview-card-danger {
  border-left: 4px solid var(--danger-500);
}

.overview-card-info {
  border-left: 4px solid var(--info-500);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .overview-card {
    padding: 1rem;
  }
  
  .overview-icon {
    font-size: 2rem;
  }
  
  .overview-value {
    font-size: var(--font-size-xl);
  }
}
</style>
