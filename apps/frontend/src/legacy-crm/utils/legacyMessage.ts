import { createApp, reactive, type App } from 'vue';
import LegacyMessageBox from '../components/LegacyMessageBox.vue';

// The Windows message boxes of the legacy program (MsgBox): a title, an
// icon, one line of text and 確定 or 是(Y)／否(N). They replace the browser's
// alert／confirm, whose look and wording differ (Win7 2026-10-08:
// 「資料查詢／已到最後一筆」, 「資料修改／確定修改這筆資料？」).
// One box shows at a time; later ones wait in turn.
export type LegacyMessageIcon = 'warning' | 'question' | 'information';

export interface LegacyMessage {
  title: string;
  text: string;
  icon: LegacyMessageIcon;
  buttons: 'ok' | 'yesNo';
  resolve: (answer: boolean) => void;
}

export const messageState = reactive<{
  current: LegacyMessage | null;
  waiting: LegacyMessage[];
}>({ current: null, waiting: [] });

let host: { app: App; element: HTMLElement } | null = null;

// The box is its own small app placed inside .legacy-root, so the legacy
// styles apply and the forms do not need a host component.
function ensureHost() {
  if (host?.element.isConnected) return;
  host?.app.unmount();
  const element = document.createElement('div');
  (document.querySelector('.legacy-root') ?? document.body).appendChild(
    element,
  );
  const app = createApp(LegacyMessageBox);
  app.mount(element);
  host = { app, element };
}

function show(message: Omit<LegacyMessage, 'resolve'>) {
  ensureHost();
  return new Promise<boolean>((resolve) => {
    const entry = { ...message, resolve };
    if (messageState.current) messageState.waiting.push(entry);
    else messageState.current = entry;
  });
}

export function closeMessage(answer: boolean) {
  const current = messageState.current;
  if (!current) return;
  messageState.current = messageState.waiting.shift() ?? null;
  current.resolve(answer);
}

export function isMessageOpen() {
  return messageState.current != null;
}

export async function legacyAlert(
  title: string,
  text: string,
  icon: LegacyMessageIcon = 'warning',
) {
  await show({ title, text, icon, buttons: 'ok' });
}

export function legacyConfirm(
  title: string,
  text: string,
  icon: LegacyMessageIcon = 'question',
) {
  return show({ title, text, icon, buttons: 'yesNo' });
}
