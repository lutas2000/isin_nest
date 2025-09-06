<template>
  <div v-if="message" :class="messageClass">
    <span v-if="showIcon" class="message-icon">{{ icon }}</span>
    {{ message }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  message: string;
  type?: 'error' | 'success' | 'warning' | 'info';
  showIcon?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'error',
  showIcon: true,
});

const messageClass = computed(() => {
  const baseClass = 'message';
  return `${baseClass} ${baseClass}-${props.type}`;
});

const icon = computed(() => {
  switch (props.type) {
    case 'error':
      return '⚠️';
    case 'success':
      return '✅';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    default:
      return '⚠️';
  }
});
</script>

<style scoped>
.message {
  padding: 1rem;
  border-radius: var(--border-radius);
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.message-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

/* 錯誤訊息樣式 */
.message-error {
  background-color: var(--danger-50);
  border: 1px solid var(--danger-200);
  color: var(--danger-700);
}

/* 成功訊息樣式 */
.message-success {
  background-color: var(--success-50);
  border: 1px solid var(--success-200);
  color: var(--success-700);
}

/* 警告訊息樣式 */
.message-warning {
  background-color: var(--warning-50);
  border: 1px solid var(--warning-200);
  color: var(--warning-700);
}

/* 資訊訊息樣式 */
.message-info {
  background-color: var(--info-50);
  border: 1px solid var(--info-200);
  color: var(--info-700);
}

/* 如果 CSS 變數不存在，使用備用樣式 */
.message-error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
}

.message-success {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #16a34a;
}

.message-warning {
  background-color: #fffbeb;
  border: 1px solid #fed7aa;
  color: #d97706;
}

.message-info {
  background-color: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #2563eb;
}
</style>
