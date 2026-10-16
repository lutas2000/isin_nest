import { nextTick } from 'vue';

// A dialog or record owns its focus order; never enter another MDI window.
function scopeFor(element: Element) {
  return (
    element.closest('[role="dialog"]') ??
    element.closest('.legacy-form') ??
    element.closest('form')
  );
}

function editable(element: HTMLElement) {
  return (
    element.tabIndex >= 0 &&
    !element.matches(
      ':disabled, [readonly], [type="hidden"], [type="button"], [type="submit"], [type="reset"]',
    ) &&
    !element.closest('[inert]') &&
    element.getClientRects().length > 0 &&
    getComputedStyle(element).visibility === 'visible'
  );
}

export function nextEditableField(from: EventTarget | null, select = true) {
  if (!(from instanceof HTMLElement)) return;
  const scope = scopeFor(from);
  if (!scope) return;
  // Positive tabindex precedes the ordinary DOM/Tab order. Buttons stay on
  // their native Enter action and are never a destination for data entry.
  const fields = Array.from(
    scope.querySelectorAll<HTMLElement>('input, select, textarea'),
  ).filter((element) => scopeFor(element) === scope && editable(element));
  fields.sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity));
  const index = fields.indexOf(from);
  const next = index >= 0 ? fields[index + 1] : undefined;
  if (!next) return;
  next.focus();
  if (select && next instanceof HTMLInputElement && next.type === 'text')
    next.select();
}

// Capture before per-field Enter handlers so IME confirmation cannot query
// or advance. Existing lookup/confirmation actions opt out of navigation.
export function handleLegacyEnter(event: KeyboardEvent) {
  if (event.key !== 'Enter') return;
  if (event.isComposing || event.keyCode === 229) {
    event.stopPropagation();
    return;
  }
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const target = event.target;
  if (
    !(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)
  )
    return;
  if (
    !editable(target) ||
    target.closest('[data-enter-action="true"], .legacy-prompt')
  )
    return;
  event.preventDefault();
  // Let change/synchronization handlers finish before moving the focus.
  void nextTick(() => {
    if (document.activeElement === target) nextEditableField(target);
  });
}
