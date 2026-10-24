import { useEffect, useState } from "react";
import type { Checklist, ItemShelf, Note, WikiAsk, WikiHit } from "@/app/_types";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { fetchItemsByUuid, fetchTaggedItems, fetchWikiTargets } from "@/app/_utils/ui-lookups";
import { batchLoader } from "@/app/_utils/batch-loader";
import { wikiAskKey } from "@/app/_utils/wiki-match-utils";
import { libraryEpoch } from "@/app/_utils/sidebar-tree-utils";

export type LinkedItem = Partial<Note> | Partial<Checklist>;

const EPOCH_SPLIT = "\u0001";

const _split = (key: string) => {
  const at = key.indexOf(EPOCH_SPLIT);
  return key.slice(at + 1);
};

const itemLoader = batchLoader<LinkedItem>(async (keys) => {
  const result = await fetchItemsByUuid(keys.map(_split));
  if (!result.success || !result.data) throw new Error(result.error);
  const byUuid = new Map<string, LinkedItem>();
  [...result.data.notes, ...result.data.checklists].forEach((item) => {
    if (item.uuid) byUuid.set(item.uuid.toLowerCase(), item);
  });
  return Object.fromEntries(
    keys.flatMap((key) => {
      const item = byUuid.get(_split(key));
      return item ? [[key, item]] : [];
    }),
  );
});

const wikiLoader = batchLoader<WikiHit | null>(async (keys) => {
  const asks: WikiAsk[] = keys.map((key) => {
    const [target, bound] = _split(key).split("\u0000");
    return { target, bound: bound || undefined };
  });
  const result = await fetchWikiTargets(asks);
  if (!result.success || !result.data) throw new Error(result.error);
  const hits = result.data;
  return Object.fromEntries(keys.map((key, at) => [key, hits[wikiAskKey(asks[at])] ?? null]));
});

const useEpoch = (): string | null => {
  const { sidebar, user } = useAppMode();
  return user ? libraryEpoch(sidebar) : null;
};

export const useLinkedItem = (uuid?: string): LinkedItem | undefined => {
  const epoch = useEpoch();
  const [found, setFound] = useState<{ key: string; item?: LinkedItem }>();
  const key = uuid && epoch !== null ? `${epoch}${EPOCH_SPLIT}${uuid.toLowerCase()}` : "";

  useEffect(() => {
    if (!key) return;
    let live = true;
    itemLoader.get(key).then((item) => {
      if (live) setFound({ key, item });
    });
    return () => {
      live = false;
    };
  }, [key]);

  return found?.key === key ? found.item : undefined;
};

export const useWikiHit = (target: string, bound?: string): WikiHit | null | undefined => {
  const epoch = useEpoch();
  const [found, setFound] = useState<{ key: string; hit: WikiHit | null }>();
  const key = epoch !== null ? `${epoch}${EPOCH_SPLIT}${wikiAskKey({ target, bound })}` : "";

  useEffect(() => {
    if (!key) return;
    let live = true;
    wikiLoader.get(key).then((hit) => {
      if (live) setFound({ key, hit: hit ?? null });
    });
    return () => {
      live = false;
    };
  }, [key]);

  return found?.key === key ? found.hit : undefined;
};

const taggedCache = new Map<string, Promise<ItemShelf | undefined>>();

const _keepEpoch = (epoch: string) =>
  taggedCache.forEach((_, key) => {
    if (!key.startsWith(`${epoch}${EPOCH_SPLIT}`)) taggedCache.delete(key);
  });

export const useTaggedItems = (tag: string, active: boolean): ItemShelf | undefined => {
  const epoch = useEpoch();
  const [found, setFound] = useState<{ key: string; shelf?: ItemShelf }>();
  const key = tag && epoch !== null ? `${epoch}${EPOCH_SPLIT}${tag}` : "";

  useEffect(() => {
    if (!key || !active) return;
    let live = true;
    if (!taggedCache.has(key)) {
      _keepEpoch(epoch!);
      taggedCache.set(
        key,
        fetchTaggedItems(tag)
          .then((result) => (result.success ? result.data : undefined))
          .catch((error) => {
            console.error(`Could not load items tagged ${tag}:`, error);
            taggedCache.delete(key);
            return undefined;
          }),
      );
    }
    taggedCache.get(key)!.then((shelf) => {
      if (live) setFound({ key, shelf });
    });
    return () => {
      live = false;
    };
  }, [key, active, tag]);

  return found?.key === key ? found.shelf : undefined;
};
