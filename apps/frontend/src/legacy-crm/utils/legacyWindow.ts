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
