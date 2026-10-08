import {
  computed,
  inject,
  ref,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from 'vue';

// Several MDI child windows stay open at once, like the legacy program; only
// the active one may react to keyboard shortcuts. The shell provides this key
// for every child window.
export const WINDOW_ACTIVE_KEY: InjectionKey<Ref<boolean>> = Symbol(
  'legacy-window-active',
);

export function useWindowActive(): ComputedRef<boolean> {
  const active = inject(WINDOW_ACTIVE_KEY, ref(true));
  return computed(() => active.value);
}

// True when the key event came from a field the user is typing in.
export function isTypingTarget(event: Event): boolean {
  const target = event.target as Element | null;
  return Boolean(
    target?.closest?.("input, textarea, select, [contenteditable='true']"),
  );
}

// Lets a form close its own MDI window, as the legacy 關閉 C button does.
export const CLOSE_WINDOW_KEY: InjectionKey<() => void> = Symbol(
  'legacy-close-window',
);

export function useCloseWindow(): () => void {
  return inject(CLOSE_WINDOW_KEY, () => {});
}

// Alt+letter on a form presses the toolbar button with that underlined
// letter before the menu bar sees it (Win7 2026-10-08: Alt+R on 客戶建檔 opens
// 查詢, not 報表列印). The active form's toolbar registers its handler here;
// the shell's menu key handler asks it first.
const altKeyHandlers = new Set<(event: KeyboardEvent) => boolean>();

export function registerAltKeyHandler(
  handler: (event: KeyboardEvent) => boolean,
): () => void {
  altKeyHandlers.add(handler);
  return () => altKeyHandlers.delete(handler);
}

export function handleToolbarAltKey(event: KeyboardEvent): boolean {
  for (const handler of altKeyHandlers) if (handler(event)) return true;
  return false;
}
