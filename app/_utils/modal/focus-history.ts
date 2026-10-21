const HISTORY_LIMIT = 16;

const history: HTMLElement[] = [];
let isTracking = false;

const remember = (event: FocusEvent) => {
  const target = event.target;
  if (!(target instanceof HTMLElement) || target === document.body) return;
  const index = history.indexOf(target);
  if (index !== -1) history.splice(index, 1);
  history.push(target);
  if (history.length > HISTORY_LIMIT) history.shift();
};

export const trackFocus = () => {
  if (isTracking || typeof document === "undefined") return;
  isTracking = true;
  document.addEventListener("focusin", remember, true);
};

const isUsable = (element: HTMLElement | null, outside: HTMLElement | null): element is HTMLElement =>
  Boolean(element) &&
  element!.isConnected &&
  element !== document.body &&
  !outside?.contains(element!);

export const lastFocusOutside = (container: HTMLElement | null): HTMLElement | null => {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (isUsable(history[index], container)) return history[index];
  }
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  return isUsable(active, container) ? active : null;
};

export const restoreFocus = (opener: HTMLElement | null, container: HTMLElement | null) => {
  const target = isUsable(opener, container) ? opener : lastFocusOutside(container);
  target?.focus({ preventScroll: true });
};
