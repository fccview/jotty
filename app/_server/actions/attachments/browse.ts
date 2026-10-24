import type { AttachmentFolder, AttachmentPage, FileItem, Result } from "@/app/_types";
import { ATTACHMENT_PAGE_SIZE } from "@/app/_consts/attachments";
import { getUsername } from "@/app/_server/actions/users";
import { visibleItems, type VisibleItem } from "@/app/_server/actions/relations/queries";
import { relationsDb } from "@/app/_server/actions/relations/store";
import { ensureRelations } from "@/app/_server/actions/relations/night-shift";
import { AttachedItem, locateItem, mayView } from "./access";
import { describeFile, listFolder } from "./store";

interface FolderRow {
  item: string;
  count: number;
  size: number;
  mtime: number;
}

interface FileRow {
  item: string;
  name: string;
  size: number;
  mtime: number;
}

const NOT_SIGNED_IN = { success: false, error: "Not authenticated" } as const;
const BAD_REQUEST = { success: false, error: "Invalid attachments request" } as const;
const SEARCH_MAX = 200;

const _offset = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

const _likeOf = (query: string): string =>
  `%${query.toLowerCase().replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

const _page = <T>(rows: Iterator<T>, offset: number, keep: (row: T) => boolean): AttachmentPage<T> => {
  const entries: T[] = [];
  let skipped = 0;

  try {
    for (let next = rows.next(); !next.done; next = rows.next()) {
      const row = next.value;
      if (!keep(row)) continue;
      if (skipped < offset) {
        skipped++;
        continue;
      }
      if (entries.length === ATTACHMENT_PAGE_SIZE) return { entries, hasMore: true };
      entries.push(row);
    }
  } finally {
    rows.return?.();
  }

  return { entries, hasMore: false };
};

const _mapPage = <T, R>(page: AttachmentPage<T>, map: (row: T) => R): AttachmentPage<R> => ({
  entries: page.entries.map(map),
  hasMore: page.hasMore,
});

const _visible = async (username: string): Promise<Map<string, VisibleItem>> => {
  ensureRelations();
  const visible = await visibleItems(username);
  visible.forEach((item, uuid) => item.encrypted && visible.delete(uuid));
  return visible;
};

export const attachmentFolders = async (
  offset: unknown,
): Promise<Result<AttachmentPage<AttachmentFolder>>> => {
  const username = await getUsername();
  if (!username) return NOT_SIGNED_IN;

  const visible = await _visible(username);
  const rows = relationsDb()
    .prepare(
      "SELECT item, COUNT(*) AS count, SUM(size) AS size, MAX(mtime) AS mtime FROM attachments GROUP BY item ORDER BY mtime DESC",
    )
    .iterate() as Iterator<FolderRow>;

  const page = _page(rows, _offset(offset), (row) => visible.has(row.item.toLowerCase()));

  return {
    success: true,
    data: _mapPage(page, (row) => {
      const item = visible.get(row.item.toLowerCase())!;
      return {
        itemUuid: row.item,
        title: item.title,
        itemType: item.type,
        count: row.count,
        size: row.size,
        updatedAt: new Date(row.mtime).toISOString(),
      };
    }),
  };
};

export const searchAttachments = async (
  query: unknown,
  offset: unknown,
): Promise<Result<AttachmentPage<FileItem>>> => {
  const username = await getUsername();
  if (!username) return NOT_SIGNED_IN;
  if (typeof query !== "string" || !query.trim() || query.length > SEARCH_MAX) return BAD_REQUEST;

  const visible = await _visible(username);
  const rows = relationsDb()
    .prepare(
      "SELECT item, name, size, mtime FROM attachments WHERE name_key LIKE ? ESCAPE '\\' ORDER BY mtime DESC",
    )
    .iterate(_likeOf(query.trim())) as Iterator<FileRow>;

  const page = _page(rows, _offset(offset), (row) => visible.has(row.item.toLowerCase()));

  return {
    success: true,
    data: _mapPage(page, (row) => ({
      ...describeFile(row.item, row.name, {
        size: row.size,
        birthtime: new Date(row.mtime),
        mtime: new Date(row.mtime),
      }),
      itemTitle: visible.get(row.item.toLowerCase())?.title,
    })),
  };
};

export const folderFiles = async (
  itemUuid: unknown,
  offset: unknown,
): Promise<Result<AttachmentPage<FileItem>>> => {
  const username = await getUsername();
  if (!username) return NOT_SIGNED_IN;
  if (typeof itemUuid !== "string") return BAD_REQUEST;

  const item: AttachedItem | null = await locateItem(itemUuid);
  if (!item || !(await mayView(item, username))) {
    return { success: false, error: "Attachment folder not found" };
  }

  const files = await listFolder(item.uuid);
  const page = _page(files[Symbol.iterator](), _offset(offset), () => true);
  return { success: true, data: page };
};
