import path from "path";
import fs from "fs/promises";
import { revalidatePath } from "next/cache";
import type { Result, SanitisedUser } from "@/app/_types";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { NOTES_DIR } from "@/app/_consts/files";
import { UNCATEGORIZED, isManaged } from "@/app/_consts/notes";
import { serverWriteFile } from "@/app/_server/actions/file";
import { canReach } from "@/app/_server/actions/share/queries";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { getUserByNoteUuid } from "@/app/_server/actions/users";
import { commitNote } from "@/app/_server/actions/history";
import { logContentEvent } from "@/app/_server/actions/log";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { grepFindFileByUuid } from "@/app/_utils/grep-utils";
import { isEncrypted } from "@/app/_utils/encryption-utils";
import { extractHashtagsFromContent, normalizeTag } from "@/app/_utils/tag-utils";
import {
  extractYamlMetadata,
  generateYamlFrontmatter,
  splitFrontmatter,
} from "@/app/_utils/yaml-metadata-utils";
import { titleOf } from "@/app/_utils/title-utils";

export const SPLICE_UNCHANGED = "Nothing to change";
export const SPLICE_ENCRYPTED = "Encrypted notes stay closed";
export const SPLICE_MISSING = "Note not found";
export const SPLICE_DENIED = "Permission denied";

export type SpliceEdit = { body: string } | { error: string };

export interface Spliced {
  uuid: string;
  title: string;
  category: string;
  tags: string[];
  managed: boolean;
}

const _tagSet = (body: string): Set<string> => new Set(extractHashtagsFromContent(body));

const _storedTags = (metadata: Record<string, unknown>): string[] =>
  Array.isArray(metadata.tags) ? metadata.tags.map((tag) => normalizeTag(String(tag))).filter(Boolean) : [];

const _retagged = (metadata: Record<string, unknown>, before: string, after: string): string[] | null => {
  const was = _tagSet(before);
  const now = _tagSet(after);
  const added = [...now].filter((tag) => !was.has(tag));
  const dropped = new Set([...was].filter((tag) => !now.has(tag)));
  if (!added.length && !dropped.size) return null;
  const kept = _storedTags(metadata).filter((tag) => !dropped.has(tag));
  return Array.from(new Set([...kept, ...added])).sort();
};

const _nextTags = (
  metadata: Record<string, unknown>,
  before: string,
  after: string,
  untag: string[],
): string[] | null => {
  const retagged = _retagged(metadata, before, after);
  const base = retagged ?? _storedTags(metadata);
  const kept = base.filter((tag) => !untag.includes(tag));
  return retagged || kept.length !== base.length ? kept : null;
};

const _frontmatter = (prefix: string, metadata: Record<string, unknown>, tags: string[] | null): string => {
  if (!tags) return prefix;
  const { tags: _old, ...rest } = metadata;
  return generateYamlFrontmatter(tags.length ? { ...rest, tags } : rest);
};

const _afterWrite = async (actor: SanitisedUser, owner: string, filePath: string, spliced: Spliced) => {
  const relative = path.relative(path.join(process.cwd(), NOTES_DIR(owner)), filePath);
  commitNote(owner, relative, "update", spliced.title).catch((error) =>
    console.warn("Note history commit failed after a splice:", error),
  );
  await logContentEvent("note_updated", "note", spliced.uuid, spliced.title, true);
  try {
    revalidatePath(`/note/${spliced.uuid}`);
  } catch (error) {
    console.warn("Cache revalidation failed after a splice, the note was saved:", error);
  }
  await broadcast({ type: "note", action: "updated", entityId: spliced.uuid, username: actor.username });
};

export interface SpliceOptions {
  untag?: string[];
}

const _splice = async (
  actor: SanitisedUser,
  uuid: string,
  edit: (body: string) => SpliceEdit,
  { untag = [] }: SpliceOptions,
): Promise<Result<Spliced>> => {
  const owner = await getUserByNoteUuid(uuid);
  if (!owner.success || !owner.data) return { success: false, error: SPLICE_MISSING };
  const found = await grepFindFileByUuid(path.join(process.cwd(), NOTES_DIR(owner.data.username)), uuid);
  if (!found) return { success: false, error: SPLICE_MISSING };

  const raw = await fs.readFile(found.filePath, "utf-8");
  const { prefix, body } = splitFrontmatter(raw);
  const { metadata } = extractYamlMetadata(raw);
  if (metadata.encrypted === true || isEncrypted(body)) return { success: false, error: SPLICE_ENCRYPTED };

  const result = edit(body);
  if ("error" in result) return { success: false, error: result.error };
  const retagged = _nextTags(metadata, body, result.body, untag);
  if (result.body === body && !retagged) return { success: false, error: SPLICE_UNCHANGED };

  const next = _frontmatter(prefix, metadata, retagged) + result.body;
  await serverWriteFile(found.filePath, next);

  const spliced = {
    uuid,
    title: titleOf(metadata, body, found.id),
    category: found.category || UNCATEGORIZED,
    tags: retagged ?? _storedTags(metadata),
    managed: isManaged(metadata),
  };
  await _afterWrite(actor, owner.data.username, found.filePath, spliced);
  return { success: true, data: spliced };
};

export const spliceNote = async (
  actor: SanitisedUser,
  uuid: string,
  edit: (body: string) => SpliceEdit,
  options: SpliceOptions = {},
): Promise<Result<Spliced>> => {
  const allowed = await canReach(uuid, ItemTypes.NOTE, actor.username, PermissionTypes.EDIT);
  if (!allowed) return { success: false, error: SPLICE_DENIED };

  return runQueued(itemLane(Modes.NOTES, uuid), async () => {
    try {
      return await _splice(actor, uuid, edit, options);
    } catch (error) {
      console.error(`spliceNote failed for ${uuid}:`, error);
      return { success: false, error: "Failed to update note" };
    }
  });
};
