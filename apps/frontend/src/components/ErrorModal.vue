<template>
  <div v-if="show" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" :class="`modal-${type}`" @click.stop>
      <div class="modal-header" :class="`modal-header-${type}`">
        <div class="modal-title-wrapper">
          <span class="modal-icon">{{ icon }}</span>
          <h3>{{ title }}</h3>
        </div>
        <button class="modal-close" @click="handleClose">×</button>
      </div>
      
      <div class="modal-body">
        <p class="error-message">{{ message }}</p>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-primary" @click="handleConfirm">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  show: boolean;
  message: string;
  type?: 'error' | 'warning' | 'info';
  title?: string;
  confirmText?: string;
  closeOnOverlay?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'error',
  title: '錯誤',
  confirmText: '確定',
  closeOnOverlay: false
});

const emit = defineEmits<{
  close: [];
  confirm: [];
}>();

const icon = computed(() => {
  switch (props.type) {
    case 'error':
      return '⚠️';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    default:
      return '⚠️';
  }
});

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    handleClose();
  }
};

const handleClose = () => {
  emit('close');
};

const handleConfirm = () => {
  emit('confirm');
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: white;
  border-radius: var(--border-radius-lg, 8px);
  box-shadow: var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.2));
  width: 90%;
  max-width: 500px;
  overflow: hidden;
}

.modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid var(--secondary-200, #e5e7eb);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.modal-header h3 {
  margin: 0;
  color: var(--secondary-900, #111827);
  font-size: var(--font-size-lg, 1.125rem);
  font-weight: 600;
}

.modal-header-error {
  background-color: #fef2f2;
  border-bottom-color: #fecaca;
}

.modal-header-warning {
  background-color: #fffbeb;
  border-bottom-color: #fed7aa;
}

.modal-header-info {
  background-color: #eff6ff;
  border-bottom-color: #bfdbfe;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--secondary-500, #6b7280);
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.modal-close:hover {
  background-color: var(--secondary-100, #f3f4f6);
}

.modal-body {
  padding: 2rem;
}

.error-message {
  margin: 0;
  color: var(--secondary-700, #374151);
  font-size: var(--font-size-base, 1rem);
  line-height: 1.6;
  word-wrap: break-word;
}

.modal-footer {
  padding: 1.5rem 2rem;
  border-top: 1px solid var(--secondary-200, #e5e7eb);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.btn {
  padding: 0.5rem 1.5rem;
  border-radius: var(--border-radius, 6px);
  font-size: var(--font-size-base, 1rem);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background-color: var(--primary-600, #2563eb);
  color: white;
}

.btn-primary:hover {
  background-color: var(--primary-700, #1d4ed8);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    margin: 1rem;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1rem;
  }
  
  .modal-footer {
    flex-direction: column;
  }
  
  .modal-footer .btn {
    width: 100%;
  }
}
</style>

