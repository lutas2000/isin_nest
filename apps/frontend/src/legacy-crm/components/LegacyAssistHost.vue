<script setup lang="ts">
import { nextTick, ref, watch, type PropType } from 'vue';
import LegacyQueryWindow from './LegacyQueryWindow.vue';
import type { AssistRow, LegacyAssist } from '../utils/legacyAssist';

// Shows a form's F1 輔助輸入 window and the F10 「詞彙輸入輔助」 prompt
// (utils/legacyAssist.ts). Focus goes back to the field that asked.
const props = defineProps({
  assist: { type: Object as PropType<LegacyAssist>, required: true },
});

const code = ref('');
const input = ref<HTMLInputElement | null>(null);
let returnFocus: HTMLElement | null = null;

watch(
  () => props.assist.state.window || props.assist.state.phrase,
  (open, wasOpen) => {
    if (open && !wasOpen)
      returnFocus = document.activeElement as HTMLElement | null;
    if (!open && wasOpen) nextTick(() => returnFocus?.focus?.());
  },
);

watch(
  () => props.assist.state.phrase,
  (phrase) => {
    if (!phrase) return;
    code.value = '';
    nextTick(() => input.value?.focus());
  },
);

function choose(row: AssistRow) {
  returnFocus?.focus?.();
  props.assist.choose(row);
}
</script>

<template>
  <LegacyQueryWindow
    v-if="assist.state.window"
    :title="assist.state.window.title"
    :columns="assist.state.window.columns"
    :rows="assist.state.window.rows"
    :loading="assist.state.window.loading"
    :error="assist.state.window.error"
    :preview="Boolean(assist.state.window.preview)"
    :detail-columns="assist.state.window.detailColumns ?? null"
    v-bind="assist.state.window.hint ? { hint: assist.state.window.hint } : {}"
    @select="choose"
    @cancel="assist.close()"
  />
  <div
    v-if="assist.state.phrase"
    class="legacy-modal-backdrop legacy-prompt-backdrop"
  >
    <form
      class="legacy-prompt"
      role="dialog"
      aria-modal="true"
      aria-label="詞彙輸入輔助"
      @submit.prevent="assist.confirmPhrase(code)"
      @keydown.esc.prevent.stop="assist.cancelPhrase()"
    >
      <div class="legacy-dialog-title"><span>詞彙輸入輔助</span></div>
      <label class="legacy-prompt-field"
        >請輸入詞彙編號：<input ref="input" v-model="code" maxlength="10"
      /></label>
      <div class="legacy-prompt-buttons">
        <button type="submit">確　定</button>
        <button type="button" @click="assist.cancelPhrase()">取　消</button>
      </div>
    </form>
  </div>
</template>
