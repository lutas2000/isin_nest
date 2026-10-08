<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { closeMessage, messageState } from '../utils/legacyMessage';

// A Windows message box as the legacy program shows it on Win7 (Windows 7
// Basic frame, classic buttons; measured 2026-10-08): the title bar, a white
// band with a 32px icon and the text, a grey band with the buttons on the
// right. 確定 closes with Enter, Space or Esc; 是(Y)／否(N) answer with Y／N,
// Enter or Space on the focused button, and Esc does nothing (the close box
// is disabled, as in Windows). ←／→ and Tab move between the buttons.
const message = computed(() => messageState.current);
const box = ref<HTMLElement | null>(null);
const buttons = ref<HTMLButtonElement[]>([]);
const focused = ref(0);
const position = ref({ left: 0, top: 0 });

const choices = computed(() =>
  message.value?.buttons === 'yesNo'
    ? [
        { answer: true, text: '是', key: 'Y' },
        { answer: false, text: '否', key: 'N' },
      ]
    : [{ answer: true, text: '確定', key: '' }],
);

// Windows centres the box on the screen.
async function place() {
  focused.value = 0;
  await nextTick();
  if (!box.value) return;
  position.value = {
    left: Math.round((window.innerWidth - box.value.offsetWidth) / 2),
    top: Math.round((window.innerHeight - box.value.offsetHeight) / 2),
  };
  buttons.value[0]?.focus();
}
watch(message, (value) => value && void place(), { immediate: true });

function answer(value: boolean) {
  closeMessage(value);
}

function focusButton(index: number) {
  const count = choices.value.length;
  focused.value = (index + count) % count;
  buttons.value[focused.value]?.focus();
}

// Captures every key while a box is open, so the forms behind it and the
// menu bar get none, as with a modal Windows box.
function handleKey(event: KeyboardEvent) {
  if (!message.value) return;
  event.stopImmediatePropagation();
  const key = event.key;
  if (key === 'Enter' || key === ' ') {
    event.preventDefault();
    if (key === 'Enter' || event.type === 'keydown')
      answer(choices.value[focused.value].answer);
    return;
  }
  if (key === 'Escape') {
    event.preventDefault();
    if (message.value.buttons === 'ok') answer(true);
    return;
  }
  if (key === 'Tab' || key === 'ArrowRight' || key === 'ArrowDown') {
    event.preventDefault();
    focusButton(focused.value + (event.shiftKey && key === 'Tab' ? -1 : 1));
    return;
  }
  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    event.preventDefault();
    focusButton(focused.value - 1);
    return;
  }
  const choice = choices.value.find(
    (entry) => entry.key && entry.key === key.toUpperCase(),
  );
  event.preventDefault();
  if (choice) answer(choice.answer);
}

onMounted(() => window.addEventListener('keydown', handleKey, true));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKey, true));
</script>

<template>
  <div v-if="message" class="legacy-msgbox-layer" @mousedown.prevent>
    <section
      ref="box"
      class="legacy-w7-window legacy-msgbox"
      role="alertdialog"
      aria-modal="true"
      :aria-label="message.title"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }"
    >
      <header class="legacy-w7-titlebar">
        <span class="legacy-w7-title">{{ message.title }}</span>
        <button
          type="button"
          class="legacy-w7-close"
          tabindex="-1"
          aria-label="關閉"
          :disabled="message.buttons !== 'ok'"
          @click="answer(true)"
        ></button>
      </header>
      <div class="legacy-w7-client">
        <div class="legacy-msgbox-body">
          <svg
            class="legacy-msgbox-icon"
            viewBox="0 0 32 32"
            width="32"
            height="32"
            aria-hidden="true"
          >
            <template v-if="message.icon === 'question'">
              <defs>
                <radialGradient id="legacy-q" cx="40%" cy="30%" r="75%">
                  <stop offset="0" stop-color="#6fa8ff" />
                  <stop offset="0.6" stop-color="#1d5bd6" />
                  <stop offset="1" stop-color="#0f3a96" />
                </radialGradient>
              </defs>
              <circle cx="16" cy="16" r="14.5" fill="#d8dde6" />
              <circle cx="16" cy="16" r="12.5" fill="url(#legacy-q)" />
              <path
                d="M12 12.5a4 4 0 1 1 6 3.4c-1.4.8-2 1.5-2 3v1"
                fill="none"
                stroke="#fff"
                stroke-width="2.6"
                stroke-linecap="round"
              />
              <circle cx="16" cy="24" r="1.7" fill="#fff" />
            </template>
            <template v-else-if="message.icon === 'information'">
              <circle cx="16" cy="16" r="14.5" fill="#d8dde6" />
              <circle cx="16" cy="16" r="12.5" fill="#1d5bd6" />
              <rect x="14.4" y="13" width="3.2" height="11" fill="#fff" />
              <circle cx="16" cy="9" r="1.9" fill="#fff" />
            </template>
            <template v-else>
              <defs>
                <linearGradient id="legacy-w" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="#ffe680" />
                  <stop offset="1" stop-color="#f2b600" />
                </linearGradient>
              </defs>
              <path
                d="M16 3.5 29.5 28h-27Z"
                fill="url(#legacy-w)"
                stroke="#b98a00"
                stroke-width="1.2"
                stroke-linejoin="round"
              />
              <rect x="14.5" y="11" width="3" height="10" rx="1" fill="#222" />
              <circle cx="16" cy="24.2" r="1.6" fill="#222" />
            </template>
          </svg>
          <p class="legacy-msgbox-text">{{ message.text }}</p>
        </div>
        <div class="legacy-msgbox-buttons">
          <button
            v-for="(choice, index) in choices"
            :key="choice.text"
            ref="buttons"
            type="button"
            class="legacy-classic-button"
            :class="{ default: index === focused }"
            @focus="focused = index"
            @click="answer(choice.answer)"
          >
            {{ choice.text
            }}<template v-if="choice.key"
              >(<span class="legacy-accel">{{ choice.key }}</span
              >)</template
            >
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
