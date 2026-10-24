import path from "path";
import fs from "fs/promises";
import { revalidatePath } from "next/cache";
import type { Result, SanitisedUser } from "@/app/_types";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { NOTES_DIR } from "@/app/_consts/files";
import { UNCATEGORIZED, isManaged } from "@/app/_consts/notes";
import { serverWriteFile } from "@/app/_server/actions/file";
import { reachableFile } from "@/app/_server/actions/share/queries";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { commitNote } from "@/app/_server/actions/history/repo";
import { logContentEvent } from "@/app/_server/actions/log";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { isEncrypted } from "@/app/_utils/encryption-utils";
import { mergeTags, tagList } from "@/app/_utils/tag-utils";
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

const _storedTags = (metadata: Record<string, unknown>): string[] => tagList(metadata.tags);

const _retagged = (metadata: Record<string, unknown>, before: string, after: string): string[] | null => {
  if (before === after) return null;
  const stored = _storedTags(metadata);
  const next = mergeTags(stored, before, after);
  return next.length === stored.length && next.every((tag, index) => tag === stored[index]) ? null : next;
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

const _placeOf = (filePath: string) => {
  const [owner, ...rest] = path
    .relative(path.join(process.cwd(), NOTES_DIR("")), filePath)
    .split(path.sep);
  rest.pop();
  return { owner, id: path.basename(filePath, ".md"), category: rest.join("/"), filePath };
};

const _splice = async (
  actor: SanitisedUser,
  uuid: string,
  filePath: string,
  edit: (body: string) => SpliceEdit,
  { untag = [] }: SpliceOptions,
): Promise<Result<Spliced>> => {
  const found = _placeOf(filePath);
  if (!found.owner) return { success: false, error: SPLICE_MISSING };

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
  await _afterWrite(actor, found.owner, found.filePath, spliced);
  return { success: true, data: spliced };
};

export const spliceNote = async (
  actor: SanitisedUser,
  uuid: string,
  edit: (body: string) => SpliceEdit,
  options: SpliceOptions = {},
): Promise<Result<Spliced>> =>
  runQueued(itemLane(Modes.NOTES, uuid), async (): Promise<Result<Spliced>> => {
    try {
      const filePath = await reachableFile(uuid, ItemTypes.NOTE, actor.username, PermissionTypes.EDIT);
      if (!filePath) return { success: false, error: SPLICE_DENIED };

      return await _splice(actor, uuid, filePath, edit, options);
    } catch (error) {
      console.error(`spliceNote failed for ${uuid}:`, error);
      return { success: false, error: "Failed to update note" };
    }
  });
