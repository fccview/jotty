import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export const TOOLBAR_SLOT_ATTR = "data-toolbar-slot";
export const TOOLBAR_RESERVE_ATTR = "data-toolbar-reserve";

export const useToolbarOverflow = (keys: string[]) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const widths = useRef(new Map<string, number>());
  const [visibleCount, setVisibleCount] = useState(keys.length);
  const signature = keys.join("|");

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;

    row.querySelectorAll<HTMLElement>(`[${TOOLBAR_SLOT_ATTR}]`).forEach((slot) => {
      const key = slot.getAttribute(TOOLBAR_SLOT_ATTR);
      if (key) widths.current.set(key, slot.getBoundingClientRect().width);
    });

    if (keys.some((key) => !widths.current.has(key))) {
      setVisibleCount(keys.length);
      return;
    }

    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    const reserve = row.querySelector<HTMLElement>(`[${TOOLBAR_RESERVE_ATTR}]`);
    const reserved = reserve ? reserve.getBoundingClientRect().width + gap : 0;
    const available = row.clientWidth - reserved;
    let used = 0;
    let fits = 0;

    for (const key of keys) {
      const next = used + (fits ? gap : 0) + (widths.current.get(key) ?? 0);
      if (next > available) break;
      used = next;
      fits++;
    }

    setVisibleCount(fits);
  }, [signature]);

  useLayoutEffect(measure, [measure, visibleCount]);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(row);
    return () => observer.disconnect();
  }, [measure]);

  return { rowRef, visibleCount };
};
