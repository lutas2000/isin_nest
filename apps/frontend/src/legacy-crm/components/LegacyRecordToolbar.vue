<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
} from 'vue';
import { useLegacyReadOnly } from '../utils/legacyAccess';
import { isMessageOpen } from '../utils/legacyMessage';
import {
  isTypingTarget,
  registerAltKeyHandler,
  useWindowActive,
} from '../utils/legacyWindow';

// The button row of the legacy forms, as on Win7 (2026-10-08):
// 新增 F5 / 更新 F6 / 刪除 F7 / 查詢 R / 上筆 J / 下筆 K / 頭筆 I / 尾筆 M /
// 列印 P / 關閉 C, the letters underlined. Browsing, every button works,
// with or without a record shown (更新、刪除 then answer 「請先設定編號。」 in
// the form). While adding ("new") the first two become 取消 F5 and 存檔 F6;
// 查詢 R stays available and the rest are greyed out. A user with `crm`
// read only cannot use 新增、更新、刪除 (LEGACY-CRM-REBUILD-PLAN.md 5.1).
// Keys: F5–F7; Alt+letter anywhere in the form (before the menu bar); the
// letter alone when not typing in a field.
const props = defineProps({
  mode: { type: String, default: 'view' },
  hasRecord: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  // Whether the form has a 列印 P button, and whether it works yet.
  print: { type: Boolean, default: true },
  printEnabled: { type: Boolean, default: false },
  // The separate 列印標籤(L) button of the order and sales forms.
  label: { type: Boolean, default: false },
  labelEnabled: { type: Boolean, default: false },
});
const emit = defineEmits([
  'add',
  'edit',
  'cancel',
  'save',
  'delete',
  'query',
  'previous',
  'next',
  'first',
  'last',
  'print',
  'label',
  'close',
]);

type LetterAction =
  | 'query'
  | 'previous'
  | 'next'
  | 'first'
  | 'last'
  | 'print'
  | 'close'
  | 'label';

const root = ref<HTMLElement | null>(null);
const active = useWindowActive();
const readOnly = useLegacyReadOnly();
const editing = computed(() => props.mode === 'new');
const browseDisabled = computed(() => editing.value || props.busy);

const actions: Record<string, () => unknown> = {
  F5: () => !readOnly.value && emit(editing.value ? 'cancel' : 'add'),
  F6: () => !readOnly.value && emit(editing.value ? 'save' : 'edit'),
  F7: () => !readOnly.value && !editing.value && emit('delete'),
};
const letters: Record<string, LetterAction> = {
  KeyR: 'query',
  KeyJ: 'previous',
  KeyK: 'next',
  KeyI: 'first',
  KeyM: 'last',
  KeyP: 'print',
  KeyC: 'close',
  KeyL: 'label',
};

function letterEnabled(action: LetterAction) {
  if (props.busy) return false;
  if (action === 'query') return true;
  if (editing.value) return false;
  if (action === 'print') return props.print && props.printEnabled;
  if (action === 'label') return props.label && props.labelEnabled;
  return true;
}

function runLetter(event: KeyboardEvent): boolean {
  const action = letters[event.code];
  if (!action || !letterEnabled(action)) return false;
  event.preventDefault();
  emit(action as any);
  return true;
}

// Matched by key code because macOS turns Alt+letter into another character.
function handleAltKey(event: KeyboardEvent): boolean {
  if (
    !active.value ||
    !event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    isMessageOpen() ||
    (event.target as Element | null)?.closest?.('[role="dialog"]')
  )
    return false;
  return runLetter(event);
}

function handleKey(event: KeyboardEvent) {
  if (
    !active.value ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    props.busy ||
    isMessageOpen()
  )
    return;
  if (actions[event.key]) {
    event.preventDefault();
    actions[event.key]();
    return;
  }
  if (event.shiftKey || isTypingTarget(event)) return;
  runLetter(event);
}

// Win7 shares 793px among ten buttons (79 or 80px each) and gives nine
// buttons 88px each; 列印標籤(L) is 100px, 60px further right.
function sizeButtons() {
  const buttons = Array.from(
    root.value?.querySelectorAll<HTMLButtonElement>(
      ':scope > button:not(.legacy-record-toolbar-extra)',
    ) ?? [],
  );
  const step = buttons.length === 9 ? 88 : 793.34 / Math.max(buttons.length, 1);
  buttons.forEach((button, index) => {
    const width = Math.round((index + 1) * step) - Math.round(index * step);
    button.style.flexBasis = button.style.width = `${width}px`;
  });
}

let unregister: (() => void) | null = null;
onMounted(() => {
  window.addEventListener('keydown', handleKey);
  unregister = registerAltKeyHandler(handleAltKey);
  void nextTick(sizeButtons);
});
onUpdated(sizeButtons);
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKey);
  unregister?.();
});
</script>

<template>
  <div ref="root" class="legacy-record-toolbar" role="toolbar">
    <button
      type="button"
      :disabled="busy || readOnly"
      @click="emit(editing ? 'cancel' : 'add')"
    >
      {{ editing ? '取消 F5' : '新增 F5' }}
    </button>
    <button
      type="button"
      :disabled="busy || readOnly"
      @click="emit(editing ? 'save' : 'edit')"
    >
      {{ editing ? '存檔 F6' : '更新 F6' }}
    </button>
    <button
      type="button"
      :disabled="browseDisabled || readOnly"
      @click="emit('delete')"
    >
      刪除 F7
    </button>
    <button type="button" :disabled="busy" @click="emit('query')">
      查詢 <span class="legacy-accel">R</span>
    </button>
    <button type="button" :disabled="browseDisabled" @click="emit('previous')">
      上筆 <span class="legacy-accel">J</span>
    </button>
    <button type="button" :disabled="browseDisabled" @click="emit('next')">
      下筆 <span class="legacy-accel">K</span>
    </button>
    <button type="button" :disabled="browseDisabled" @click="emit('first')">
      頭筆 <span class="legacy-accel">I</span>
    </button>
    <button type="button" :disabled="browseDisabled" @click="emit('last')">
      尾筆 <span class="legacy-accel">M</span>
    </button>
    <button
      v-if="print"
      type="button"
      :disabled="browseDisabled || !printEnabled"
      @click="emit('print')"
    >
      列印 <span class="legacy-accel">P</span>
    </button>
    <slot name="extra" />
    <button type="button" :disabled="browseDisabled" @click="emit('close')">
      關閉 <span class="legacy-accel">C</span>
    </button>
    <button
      v-if="label"
      type="button"
      class="legacy-record-toolbar-extra"
      :disabled="browseDisabled || !labelEnabled"
      @click="emit('label')"
    >
      列印標籤(<span class="legacy-accel">L</span>)
    </button>
  </div>
</template>
