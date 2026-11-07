import path from "path";
import type { AdminCounts, AdminLibrary, AdminRow, Checklist, Note } from "@/app/_types";
import { CHECKLISTS_DIR, NOTES_DIR } from "@/app/_consts/files";
import { mapPooled } from "@/app/_server/actions/lib/concurrency";
import { countMarkdown } from "@/app/_server/actions/lib/markdown-walk";
import { canAccessAllContent, isAdmin } from "@/app/_server/actions/users";
import { Modes } from "@/app/_types/enums";
import { readNotesRecursively } from "@/app/_server/actions/note/readers";
import { readListsRecursively } from "@/app/_server/actions/checklist/readers";

const USERS_AT_ONCE = 4;
const NOTHING: AdminLibrary = { notes: [], checklists: [] };

const _abs = (dir: string): string => path.join(process.cwd(), dir);

const _rowOf = (item: Note | Checklist, size: number): AdminRow => ({
  uuid: item.uuid || "",
  id: item.id,
  title: item.title,
  owner: item.owner || "",
  category: item.category || "",
  isShared: Boolean(item.isShared),
  size,
});

const _settled = async <T>(username: string, label: string, read: () => Promise<T[]>): Promise<T[]> => {
  try {
    return await read();
  } catch (error) {
    console.error(`Admin library could not read ${username}'s ${label}:`, error);
    return [];
  }
};

const _shelfOf = async (username: string): Promise<AdminLibrary> => {
  const [notes, lists] = await Promise.all([
    _settled(username, Modes.NOTES, () =>
      readNotesRecursively(NOTES_DIR(username), username, { metadataOnly: true, withSize: true }),
    ),
    _settled(username, Modes.CHECKLISTS, () =>
      readListsRecursively(_abs(CHECKLISTS_DIR(username)), username),
    ),
  ]);
  return {
    notes: notes.map((note) => _rowOf(note, note.size ?? 0)),
    checklists: (lists as Checklist[]).map((list) => _rowOf(list, list.items.length)),
  };
};

const _itemsUnder = (dir: string): Promise<number> => countMarkdown(_abs(dir));

export const adminLibrary = async (usernames: string[]): Promise<AdminLibrary> => {
  if (!(await canAccessAllContent())) return NOTHING;
  const shelves = await mapPooled(usernames, USERS_AT_ONCE, _shelfOf);
  return {
    notes: shelves.flatMap((shelf) => shelf.notes),
    checklists: shelves.flatMap((shelf) => shelf.checklists),
  };
};

export const adminCounts = async (usernames: string[]): Promise<Record<string, AdminCounts>> => {
  if (!(await isAdmin())) return {};
  const counted = await mapPooled(usernames, USERS_AT_ONCE, async (username) => {
    const [notes, checklists] = await Promise.all([
      _itemsUnder(NOTES_DIR(username)),
      _itemsUnder(CHECKLISTS_DIR(username)),
    ]);
    return [username, { notes, checklists }] as const;
  });
  return Object.fromEntries(counted);
};
