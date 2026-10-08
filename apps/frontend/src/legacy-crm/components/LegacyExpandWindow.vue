<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';

// F12「展開顯示」of 客戶／廠商建檔 (the legacy WAX form, Win7
// 2026-10-08): a window in the middle of the screen titled with the field's
// label, holding the field's text in one long line with the field's length
// limit, the cursor at the start. Enter and Esc do nothing; 確定 puts the
// text back into the field and 取消 leaves it, both returning to the field
// with its text selected.
const props = defineProps({
  title: { type: String, required: true },
  value: { type: String, default: '' },
  maxLength: { type: Number, default: undefined },
});
const emit = defineEmits(['confirm', 'cancel']);

const text = ref(props.value);
const input = ref<HTMLInputElement | null>(null);

onMounted(() => {
  void nextTick(() => {
    input.value?.focus();
    input.value?.setSelectionRange(0, 0);
  });
});
</script>

<template>
  <div class="legacy-modal-backdrop legacy-expand-backdrop">
    <section
      class="legacy-selection legacy-expand-window"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <div class="legacy-dialog-title">
        <span>{{ title }}</span>
      </div>
      <div class="legacy-expand-body">
        <input
          ref="input"
          v-model="text"
          :maxlength="maxLength"
          :aria-label="title"
          @keydown.enter.prevent
          @keydown.esc.prevent.stop
        />
        <div class="legacy-expand-actions">
          <button type="button" @click="emit('confirm', text)">確　定</button>
          <button type="button" @click="emit('cancel')">取　消</button>
        </div>
      </div>
    </section>
  </div>
</template>
