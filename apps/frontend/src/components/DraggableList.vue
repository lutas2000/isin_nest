<template>
  <div class="draggable-list">
    <div
      v-for="(item, index) in items"
      :key="getItemKey(item, index)"
      class="draggable-item"
      :class="{ 'dragging': draggedItem?.index === index }"
      :draggable="true"
      @dragstart="handleDragStart($event, item, index)"
      @dragover.prevent="handleDragOver($event, index)"
      @drop="handleDrop($event, index)"
      @dragend="handleDragEnd"
    >
      <div class="drag-handle">☰</div>
      <div class="item-content">
        <slot name="item" :item="item" :index="index">
          <div class="item-default">{{ item }}</div>
        </slot>
      </div>
      <div v-if="showActions" class="item-actions">
        <slot name="actions" :item="item" :index="index">
          <button class="btn btn-sm btn-primary">編輯</button>
          <button class="btn btn-sm btn-danger">刪除</button>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  items: any[];
  showActions?: boolean;
  itemKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true,
  itemKey: 'id'
});

const emit = defineEmits<{
  orderChange: [newOrder: any[]];
}>();

const draggedItem = ref<{ item: any; index: number } | null>(null);
const draggedOverIndex = ref<number | null>(null);

const getItemKey = (item: any, index: number) => {
  return item[props.itemKey] || index;
};

const handleDragStart = (event: DragEvent, item: any, index: number) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', '');
  }
  draggedItem.value = { item, index };
  if (event.target) {
    (event.target as HTMLElement).style.opacity = '0.5';
  }
};

const handleDragOver = (event: DragEvent, index: number) => {
  if (!draggedItem.value) return;
  
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  draggedOverIndex.value = index;
};

const handleDrop = (event: DragEvent, dropIndex: number) => {
  event.preventDefault();
  
  if (!draggedItem.value) return;
  
  const draggedIndex = draggedItem.value.index;
  
  if (draggedIndex === -1 || draggedIndex === dropIndex) {
    handleDragEnd();
    return;
  }
  
  // 重新排序
  const newItems = [...props.items];
  const [removed] = newItems.splice(draggedIndex, 1);
  newItems.splice(dropIndex, 0, removed);
  
  // 發出順序改變事件
  emit('orderChange', newItems);
  
  handleDragEnd();
};

const handleDragEnd = () => {
  draggedItem.value = null;
  draggedOverIndex.value = null;
  // 恢復所有項目的透明度
  document.querySelectorAll('.draggable-item').forEach((item) => {
    (item as HTMLElement).style.opacity = '1';
  });
};
</script>

<style scoped>
.draggable-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.draggable-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border: 1px solid var(--secondary-200);
  border-radius: var(--border-radius);
  cursor: move;
  transition: all 0.2s ease;
}

.draggable-item:hover {
  border-color: var(--primary-300);
  box-shadow: var(--shadow);
}

.draggable-item.dragging {
  opacity: 0.5;
  background-color: var(--primary-50);
}

.drag-handle {
  color: var(--secondary-400);
  font-size: 1.25rem;
  cursor: grab;
  user-select: none;
  padding: 0.25rem;
}

.drag-handle:active {
  cursor: grabbing;
}

.item-content {
  flex: 1;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.item-default {
  color: var(--secondary-700);
}

.item-actions {
  display: flex;
  gap: 0.5rem;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .draggable-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .item-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>

