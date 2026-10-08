<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import LegacyFeedbackDialog from './LegacyFeedbackDialog.vue';
import LegacyLogWindow from './LegacyLogWindow.vue';

// 加在舊版選單列的新功能（LEGACY-CRM-REBUILD-PLAN.md 5.3、7.2、2.4）：
// - 「紀錄查詢」：只有 admin 看得到，開寫入紀錄／列印紀錄查詢視窗。沒有快捷鍵（Alt+L 是單據的列印標籤）。
// - 「回報(B)」：任何人都能用，Alt+B 開啟。
// 兩個視窗都放進 .legacy-root（Teleport），套用舊版樣式；截圖時排除。
defineProps<{ windowTitle: string }>();
const emit = defineEmits<{ open: [] }>();

const auth = useAuthStore();
const open = ref<'feedback' | 'logs' | null>(null);

function show(which: 'feedback' | 'logs') {
  emit('open');
  open.value = which;
}

function handleKey(event: KeyboardEvent) {
  if (
    event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    event.code === 'KeyB' &&
    !open.value
  ) {
    event.preventDefault();
    show('feedback');
  }
}

onMounted(() => window.addEventListener('keydown', handleKey));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKey));
</script>

<template>
  <button
    v-if="auth.isAdmin"
    type="button"
    class="legacy-menu-title"
    @click="show('logs')"
  >
    紀錄查詢
  </button>
  <button type="button" class="legacy-menu-title" @click="show('feedback')">
    回報(B)
  </button>
  <Teleport v-if="open" to=".legacy-root">
    <LegacyFeedbackDialog
      v-if="open === 'feedback'"
      :window-title="windowTitle"
      @close="open = null"
    />
    <LegacyLogWindow v-else @close="open = null" />
  </Teleport>
</template>
