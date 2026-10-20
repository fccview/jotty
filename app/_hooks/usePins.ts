"use client";

import { useCallback, useMemo } from "react";
import { ItemType } from "@/app/_types";
import { isPinnedEntry } from "@/app/_utils/global-utils";
import { usePinToggle } from "@/app/_hooks/usePinToggle";

interface PinnableItem {
  uuid: string;
}

const pinnedKeys = (entries: string[]) =>
  new Set(entries.flatMap((entry) => [entry, entry.split("/").pop() || entry]));

export const usePins = <T extends PinnableItem>(
  items: T[],
  pinnedEntries: string[] | undefined,
  type: ItemType,
) => {
  const { toggle: togglePin } = usePinToggle(type);
  const entries = useMemo(() => pinnedEntries || [], [pinnedEntries]);
  const keys = useMemo(() => pinnedKeys(entries), [entries]);

  const pinned = useMemo(
    () =>
      entries
        .map((entry) => items.find((item) => isPinnedEntry(entry, item.uuid)))
        .filter((item): item is T => Boolean(item)),
    [entries, items],
  );

  const isPinned = useCallback(
    (item: T) => Boolean(item.uuid) && keys.has(item.uuid),
    [keys],
  );

  const toggle = useCallback((item: T) => togglePin(item.uuid), [togglePin]);

  return useMemo(() => ({ pinned, isPinned, toggle }), [pinned, isPinned, toggle]);
};
