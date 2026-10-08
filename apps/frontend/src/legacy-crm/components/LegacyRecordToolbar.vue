<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useLegacyReadOnly } from '../utils/legacyAccess';
import { isTypingTarget, useWindowActive } from '../utils/legacyWindow';

// The button row of the legacy transaction forms (isin_vb6 docs/legacy-ui-spec.md):
// 新增 F5 / 更新 F6 / 刪除 F7 / 查詢 R / 上筆 J / 下筆 K / 頭筆 I / 尾筆 M /
// 列印 P / 關閉 C. A shown record is changed in place ("edit") and 更新 F6
// saves it; while adding ("new") the first two become 取消 F5 and 存檔 F6
// and the rest are greyed out. A user with `crm` read only cannot use
// 新增、更新、刪除 (LEGACY-CRM-REBUILD-PLAN.md 5.1).
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

const active = useWindowActive();
const readOnly = useLegacyReadOnly();
const editing = computed(() => props.mode === 'new');
const browseDisabled = computed(() => editing.value || props.busy);

const actions: Record<string, () => unknown> = {
  F5: () => !readOnly.value && emit(editing.value ? 'cancel' : 'add'),
  F6: () => !readOnly.value && emit(editing.value ? 'save' : 'edit'),
  F7: () =>
    !readOnly.value && !editing.value && props.hasRecord && emit('delete'),
};
const letters: Record<
  string,
  'query' | 'previous' | 'next' | 'first' | 'last' | 'print' | 'close'
> = {
  r: 'query',
  j: 'previous',
  k: 'next',
  i: 'first',
  m: 'last',
  p: 'print',
  c: 'close',
};

function handleKey(event: KeyboardEvent) {
  if (!active.value || event.ctrlKey || event.metaKey || props.busy) return;
  // 列印標籤(L): Alt+L, or L when not typing. Matched by key code because
  // macOS turns Alt+L into another character.
  if (
    props.label &&
    event.code === 'KeyL' &&
    !event.shiftKey &&
    (event.altKey || !isTypingTarget(event))
  ) {
    if (editing.value || !props.labelEnabled) return;
    event.preventDefault();
    emit('label');
    return;
  }
  if (event.altKey) return;
  if (actions[event.key]) {
    event.preventDefault();
    actions[event.key]();
    return;
  }
  // Letter shortcuts work when the user is not typing in a field; Alt+letter
  // belongs to the menu bar.
  const action = letters[event.key.toLowerCase()];
  if (!action || isTypingTarget(event) || editing.value) return;
  if (action === 'print' && !props.printEnabled) return;
  event.preventDefault();
  emit(action as any);
}

onMounted(() => window.addEventListener('keydown', handleKey));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKey));
</script>

<template>
  <div class="legacy-record-toolbar" role="toolbar">
    <button
      type="button"
      :disabled="busy || readOnly"
      @click="emit(editing ? 'cancel' : 'add')"
    >
      {{ editing ? '取消 F5' : '新增 F5' }}
    </button>
    <button
      type="button"
      :disabled="busy || readOnly || (!editing && !hasRecord)"
      @click="emit(editing ? 'save' : 'edit')"
    >
      {{ editing ? '存檔 F6' : '更新 F6' }}
    </button>
    <button
      type="button"
      :disabled="browseDisabled || readOnly || !hasRecord"
      @click="emit('delete')"
    >
      刪除 F7
    </button>
    <button type="button" :disabled="browseDisabled" @click="emit('query')">
      查詢 R
    </button>
    <button type="button" :disabled="browseDisabled" @click="emit('previous')">
      上筆 J
    </button>
    <button type="button" :disabled="browseDisabled" @click="emit('next')">
      下筆 K
    </button>
    <button type="button" :disabled="browseDisabled" @click="emit('first')">
      頭筆 I
    </button>
    <button type="button" :disabled="browseDisabled" @click="emit('last')">
      尾筆 M
    </button>
    <button
      v-if="print"
      type="button"
      :disabled="browseDisabled || !printEnabled"
      @click="emit('print')"
    >
      列印 P
    </button>
    <slot name="extra" />
    <button type="button" :disabled="editing" @click="emit('close')">
      關閉 C
    </button>
    <button
      v-if="label"
      type="button"
      class="legacy-record-toolbar-extra"
      :disabled="browseDisabled || !labelEnabled"
      @click="emit('label')"
    >
      列印標籤(L)
    </button>
  </div>
</template>
