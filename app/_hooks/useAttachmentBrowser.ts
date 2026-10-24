import { useCallback, useEffect, useRef, useState } from "react";
import type { AttachmentFolder, AttachmentPage, FileItem } from "@/app/_types";
import { AttachmentOps, UiAreas } from "@/app/_consts/ui-api";
import { askUi } from "@/app/_utils/ui-api";
import { useWebSocket } from "@/app/_providers/WebSocketProvider";

const SEARCH_DEBOUNCE_MS = 250;

interface Shelf<T> {
  entries: T[];
  hasMore: boolean;
}

const EMPTY = { entries: [], hasMore: false };

export const useAttachmentBrowser = (
  active = true,
  initial?: AttachmentPage<AttachmentFolder>,
) => {
  const { subscribe } = useWebSocket();
  const [folder, setFolder] = useState<AttachmentFolder | null>(null);
  const [query, setQuery] = useState("");
  const [needle, setNeedle] = useState("");
  const [folders, setFolders] = useState<Shelf<AttachmentFolder>>(initial ?? EMPTY);
  const seeded = useRef(Boolean(initial));
  const [files, setFiles] = useState<Shelf<FileItem>>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const asked = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setNeedle(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const _ask = useCallback(
    async <T>(op: AttachmentOps, args: Record<string, unknown>, offset: number) => {
      const ticket = ++asked.current;
      setIsLoading(true);
      try {
        const result = await askUi<AttachmentPage<T>>(UiAreas.ATTACHMENTS, op, { ...args, offset });
        if (ticket !== asked.current) return null;
        setFailed(!result.success);
        if (!result.success) console.warn("Attachments request refused:", result.error);
        return result.success ? result.data || EMPTY : null;
      } catch (error) {
        console.error("Attachments request failed:", error);
        if (ticket === asked.current) setFailed(true);
        return null;
      } finally {
        if (ticket === asked.current) setIsLoading(false);
      }
    },
    [],
  );

  const load = useCallback(
    async (append: boolean) => {
      if (needle || folder) {
        const offset = append ? files.entries.length : 0;
        const page = needle
          ? await _ask<FileItem>(AttachmentOps.SEARCH, { query: needle }, offset)
          : await _ask<FileItem>(AttachmentOps.FILES, { itemUuid: folder!.itemUuid }, offset);
        if (!page) return;
        setFiles((prev) => ({
          entries: append ? [...prev.entries, ...page.entries] : page.entries,
          hasMore: page.hasMore,
        }));
        return;
      }

      const offset = append ? folders.entries.length : 0;
      const page = await _ask<AttachmentFolder>(AttachmentOps.FOLDERS, {}, offset);
      if (!page) return;
      setFolders((prev) => ({
        entries: append ? [...prev.entries, ...page.entries] : page.entries,
        hasMore: page.hasMore,
      }));
    },
    [_ask, files.entries.length, folder, folders.entries.length, needle],
  );

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(
    () =>
      subscribe((event) => {
        if (active && event.type === "attachments") void loadRef.current(false);
      }),
    [subscribe, active],
  );

  useEffect(() => {
    if (!active) return;
    setFiles(EMPTY);
    if (seeded.current && !folder && !needle) {
      seeded.current = false;
      return;
    }
    void loadRef.current(false);
  }, [active, folder, needle]);

  return {
    folder,
    openFolder: setFolder,
    query,
    setQuery,
    searching: Boolean(needle),
    folders: folders.entries,
    files: files.entries,
    hasMore: needle || folder ? files.hasMore : folders.hasMore,
    isLoading,
    failed,
    loadMore: () => load(true),
    refresh: () => load(false),
  };
};
