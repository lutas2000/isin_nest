<template>
  <Modal
    :show="show"
    title="報價備註範本"
    max-width-class="max-w-3xl"
    @close="handleClose"
  >
    <div class="flex flex-col gap-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-secondary-700">
          備註內容
        </label>
        <textarea
          v-model="notesDraft"
          class="form-control min-h-[12rem] w-full font-sans text-sm"
          rows="10"
        />
      </div>
    </div>
    <template #footer>
      <button type="button" class="btn btn-outline" @click="handleAutofill">
        自動填入
      </button>
      <button type="button" class="btn btn-outline" @click="handleClose">
        取消
      </button>
      <button type="button" class="btn btn-primary" @click="handleApply">
        確定
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Modal from '@/components/Modal.vue';
import { buildQuoteNotesTemplate } from '@/utils/quoteNotesTemplate';

const props = defineProps<{
  show: boolean;
  /** 開啟時列上／單頭的備註；空白則 Modal 內先產生範本 */
  initialNotes?: string | null;
  /** 交貨工作天預設（範本第五條，目前為固定 7 天） */
  defaultWorkDays: number;
}>();

const emit = defineEmits<{
  close: [];
  apply: [notes: string];
}>();

const notesDraft = ref('');

function effectiveWorkDays(): number {
  const wd = props.defaultWorkDays;
  if (Number.isFinite(wd) && wd >= 1) {
    return Math.floor(wd);
  }
  return 1;
}

function handleAutofill() {
  notesDraft.value = buildQuoteNotesTemplate({
    validDays: undefined,
    workDays: effectiveWorkDays(),
  });
}

function resetFromProps() {
  const wd = effectiveWorkDays();
  const raw = props.initialNotes;
  const init = raw == null ? '' : String(raw).trim();
  if (init === '') {
    notesDraft.value = buildQuoteNotesTemplate({
      validDays: undefined,
      workDays: wd,
    });
  } else {
    notesDraft.value = String(raw);
  }
}

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      resetFromProps();
    }
  },
);

function handleClose() {
  emit('close');
}

function handleApply() {
  emit('apply', notesDraft.value ?? '');
}
</script>
