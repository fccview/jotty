"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ItemType } from "@/app/_types";
import { togglePin } from "@/app/_server/actions/dashboard";
import { isPinnedEntry } from "@/app/_utils/global-utils";

interface PinnableItem {
  uuid: string;
}

export const usePins = <T extends PinnableItem>(
  items: T[],
  pinnedEntries: string[] | undefined,
  type: ItemType,
) => {
  const router = useRouter();
  const [toggling, setToggling] = useState<string | null>(null);
  const entries = useMemo(() => pinnedEntries || [], [pinnedEntries]);

  const pinned = useMemo(
    () =>
      entries
        .map((entry) => items.find((item) => isPinnedEntry(entry, item.uuid)))
        .filter((item): item is T => Boolean(item)),
    [entries, items],
  );

  const isPinned = (item: T) =>
    entries.some((entry) => isPinnedEntry(entry, item.uuid));

  const toggle = async (item: T) => {
    if (toggling || !item.uuid) return;

    setToggling(item.uuid);
    try {
      const result = await togglePin(item.uuid, type);
      if (result.success) {
        router.refresh();
      } else {
        console.warn("Pin toggle refused:", result.error);
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    } finally {
      setToggling(null);
    }
  };

  return { pinned, isPinned, toggle };
};
