<template>
  <span class="badge" :class="badgeClass">
    {{ text }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  text: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | string;
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md'
});

const badgeClass = computed(() => {
  return `badge-${props.variant} badge-${props.size}`;
});
</script>

<style scoped>
.badge {
  padding: 0.25rem 0.75rem;
  border-radius: var(--border-radius);
  font-size: var(--font-size-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: inline-block;
}

/* 變體樣式 */
.badge-default {
  background-color: var(--secondary-100);
  color: var(--secondary-700);
}

.badge-primary {
  background-color: var(--primary-100);
  color: var(--primary-700);
}

.badge-success {
  background-color: var(--success-100);
  color: var(--success-700);
}

.badge-warning {
  background-color: var(--warning-100);
  color: var(--warning-700);
}

.badge-danger {
  background-color: var(--danger-100);
  color: var(--danger-700);
}

.badge-info {
  background-color: var(--info-100);
  color: var(--info-700);
}

.badge-secondary {
  background-color: var(--secondary-100);
  color: var(--secondary-700);
}

/* 尺寸樣式 */
.badge-sm {
  padding: 0.125rem 0.5rem;
  font-size: 0.625rem;
}

.badge-md {
  padding: 0.25rem 0.75rem;
  font-size: var(--font-size-xs);
}

.badge-lg {
  padding: 0.375rem 1rem;
  font-size: var(--font-size-sm);
}
</style>
