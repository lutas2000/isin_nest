<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useRoute } from 'vue-router';
import {
  FEEDBACK_KIND_LABELS,
  FEEDBACK_SCREENSHOT_MAX_BYTES,
  submitFeedback,
  type FeedbackKind,
} from '../../services/feedback';
import { useLegacyModalKeys } from '../utils/legacyModalKeys';

// 回報(B)（LEGACY-CRM-REBUILD-PLAN.md 7.2）：類型、標題、描述，可附目前畫面的截圖。
// 截圖會含客戶資料，所以預設不勾；勾選時先擷取 .legacy-root（不含這個對話框）並顯示預覽，
// 使用者看過再送出。送出後回報者自己也看不到截圖，只有 admin 能在新系統的回報處理頁看。
const props = defineProps<{ windowTitle: string }>();
const emit = defineEmits<{ close: [] }>();

const route = useRoute();
const kinds = Object.entries(FEEDBACK_KIND_LABELS) as [FeedbackKind, string][];
const kind = ref<FeedbackKind>('bug');
const title = ref('');
const body = ref('');
const attach = ref(false);
const screenshot = ref<Blob | null>(null);
const previewUrl = ref<string | null>(null);
const capturing = ref(false);
const sending = ref(false);
const message = ref('');
const error = ref(false);
const sentId = ref<number | null>(null);
const titleInput = ref<HTMLInputElement | null>(null);
const attachInput = ref<HTMLInputElement | null>(null);
const doneButton = ref<HTMLButtonElement | null>(null);
const busy = computed(() => capturing.value || sending.value);

function setPreview(blob: Blob | null) {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  screenshot.value = blob;
  previewUrl.value = blob ? URL.createObjectURL(blob) : null;
}

async function capture() {
  const root = document.querySelector<HTMLElement>('.legacy-root');
  if (!root) return;
  capturing.value = true;
  message.value = '';
  try {
    // 只在要截圖時才載入。字型不內嵌（3 MB 的正宋體會讓截圖很慢）：現場 Windows 用本機細明體。
    const { toBlob } = await import('html-to-image');
    const blob = await toBlob(root, {
      pixelRatio: 1,
      skipFonts: true,
      backgroundColor: '#f0f0f0',
      filter: (node) =>
        !(
          node instanceof Element &&
          node.classList.contains('legacy-feedback-layer')
        ),
    });
    if (!blob) throw new Error('瀏覽器沒有產生圖檔');
    if (blob.size > FEEDBACK_SCREENSHOT_MAX_BYTES)
      throw new Error('截圖超過 5 MB，請不要附上截圖');
    setPreview(blob);
  } catch (reason) {
    attach.value = false;
    setPreview(null);
    error.value = true;
    message.value = `無法擷取畫面：${reason instanceof Error ? reason.message : String(reason)}`;
  } finally {
    capturing.value = false;
    // 擷取時勾選框暫時停用會失去焦點；拉回對話框內，Esc 與按鍵才不會落到後面的表單。
    await nextTick();
    attachInput.value?.focus();
  }
}

watch(attach, (value) => {
  if (value) void capture();
  else setPreview(null);
});

function context() {
  return {
    route: route.fullPath,
    window: props.windowTitle || null,
    screen: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    device_pixel_ratio: window.devicePixelRatio,
    user_agent: navigator.userAgent,
    client_version: import.meta.env.VITE_APP_VERSION ?? null,
    reported_at: new Date().toISOString(),
  };
}

async function send() {
  if (busy.value || sentId.value) return;
  error.value = true;
  if (!title.value.trim()) {
    message.value = '請輸入標題。';
    titleInput.value?.focus();
    return;
  }
  if (!body.value.trim()) {
    message.value = '請輸入描述。';
    return;
  }
  if (attach.value && !screenshot.value) {
    message.value = '截圖還沒擷取完成。';
    return;
  }
  sending.value = true;
  message.value = '送出中…';
  error.value = false;
  try {
    const { item } = await submitFeedback(
      {
        kind: kind.value,
        title: title.value.trim(),
        body: body.value.trim(),
        context: context(),
        screenshot: attach.value ? screenshot.value : null,
      },
      true,
    );
    sentId.value = item.id;
    message.value = `回報已送出，編號 ${item.id}。謝謝！`;
    setPreview(null);
    await nextTick();
    doneButton.value?.focus();
  } catch (reason) {
    error.value = true;
    message.value = reason instanceof Error ? reason.message : '送出失敗';
  } finally {
    sending.value = false;
  }
}

function close() {
  if (!sending.value) emit('close');
}

// 對話框內的按鍵不交給後面的表單（F5～F7、查詢 R…），F 鍵也不讓瀏覽器重新整理。
function handleKey(event: KeyboardEvent) {
  event.stopPropagation();
  if (/^F\d{1,2}$/.test(event.key)) event.preventDefault();
  if (event.key === 'Escape') {
    event.preventDefault();
    close();
  } else if (event.altKey && event.code === 'KeyS') {
    event.preventDefault();
    void send();
  }
}

const layer = ref<HTMLElement | null>(null);
useLegacyModalKeys(layer, handleKey);

onMounted(() => {
  void nextTick(() => titleInput.value?.focus());
});
onBeforeUnmount(() => setPreview(null));
</script>

<template>
  <div
    ref="layer"
    class="legacy-modal-backdrop legacy-feedback-layer"
    @keydown="handleKey"
    @click.self="close"
  >
    <section
      class="legacy-feedback"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legacy-feedback-title"
    >
      <div class="legacy-dialog-title">
        <span id="legacy-feedback-title">回報問題或需求</span>
        <button
          type="button"
          class="legacy-window-close"
          aria-label="關閉"
          :disabled="sending"
          @click="close"
        >
          ×
        </button>
      </div>
      <div class="legacy-feedback-body">
        <fieldset
          class="legacy-groupbox legacy-feedback-kinds"
          :disabled="busy || !!sentId"
        >
          <legend>類型</legend>
          <label
            v-for="[value, label] in kinds"
            :key="value"
            class="legacy-radio"
          >
            <input
              v-model="kind"
              type="radio"
              name="legacy-feedback-kind"
              :value="value"
            />
            {{ label }}
          </label>
        </fieldset>
        <label class="legacy-feedback-field">
          <span>標題</span>
          <input
            ref="titleInput"
            v-model="title"
            maxlength="100"
            :disabled="busy || !!sentId"
          />
        </label>
        <label class="legacy-feedback-field">
          <span>描述</span>
          <textarea
            v-model="body"
            rows="6"
            maxlength="5000"
            placeholder="發生了什麼事、在哪個畫面、做了哪些操作、希望怎麼改"
            :disabled="busy || !!sentId"
          ></textarea>
        </label>
        <label class="legacy-feedback-check">
          <input
            ref="attachInput"
            v-model="attach"
            type="checkbox"
            :disabled="busy || !!sentId"
          />
          附上目前畫面截圖
        </label>
        <div v-if="attach" class="legacy-feedback-preview">
          <p v-if="capturing">擷取畫面中…</p>
          <template v-else-if="previewUrl">
            <img :src="previewUrl" alt="目前畫面截圖預覽" />
            <p>
              截圖會包含畫面上的資料（含客戶資料），只有管理員看得到。確認內容後再送出。
            </p>
          </template>
        </div>
        <p class="legacy-feedback-message" :class="{ error }" role="status">
          {{ message }}
        </p>
      </div>
      <div class="legacy-feedback-buttons">
        <template v-if="sentId">
          <button ref="doneButton" type="button" @click="close">確定</button>
        </template>
        <template v-else>
          <button type="button" :disabled="busy" @click="send">送出(S)</button>
          <button type="button" :disabled="sending" @click="close">取消</button>
        </template>
      </div>
    </section>
  </div>
</template>
