import path from "path";
import fs from "fs/promises";
import { DATA_DIR } from "@/app/_consts/files";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import { isUuid } from "@/app/_consts/identity";
import { SpecSections, SpecStatus } from "@/app/_consts/agents";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { reachableFile } from "@/app/_server/actions/share/queries";
import { serverReadFile } from "@/app/_server/actions/file";
import { parseNoteContent } from "@/app/_utils/client-parser-utils";
import { isEncrypted } from "@/app/_utils/encryption-utils";
import { toIso } from "@/app/_utils/yaml-metadata-utils";
import { SpecText, specSections } from "@/app/_utils/spec/sections";
import { specAgents } from "@/app/_utils/spec/roster";
import { AgentRole, ContextSpecNote } from "@/app/_types/agents";

export interface SpecRead {
  status: SpecStatus;
  note?: ContextSpecNote;
  sections: SpecText;
  agents: AgentRole[];
}

const _unread = (status: SpecStatus): SpecRead => ({ status, sections: {}, agents: [] });

const _placeOf = (filePath: string): { owner?: string; category: string } => {
  const notesRoot = path.join(process.cwd(), DATA_DIR, Modes.NOTES);
  const [owner, ...folders] = path.relative(notesRoot, path.resolve(filePath)).split(path.sep);
  folders.pop();
  return { ...(owner && { owner }), category: folders.join("/") || UNCATEGORIZED };
};

const _stampOf = async (filePath: string): Promise<string> => {
  try {
    return toIso((await fs.stat(filePath)).mtime);
  } catch (error) {
    console.warn("Could not stat the spec note:", error);
    return toIso(null);
  }
};

export const readSpec = async (
  noteUuid: string | undefined,
  username: string,
): Promise<SpecRead> => {
  if (!noteUuid) return _unread(SpecStatus.NONE);
  if (!isUuid(noteUuid)) return _unread(SpecStatus.MISSING);

  const filePath = await reachableFile(noteUuid, ItemTypes.NOTE, username, PermissionTypes.READ);
  if (!filePath) return _unread(SpecStatus.MISSING);

  const raw = await serverReadFile(filePath);
  if (!raw) return _unread(SpecStatus.MISSING);

  const parsed = parseNoteContent(raw, path.basename(filePath, ".md"));
  if (parsed.encrypted || isEncrypted(parsed.content)) return _unread(SpecStatus.ENCRYPTED);

  const sections = specSections(parsed.content);

  return {
    status: SpecStatus.LINKED,
    note: {
      id: parsed.uuid || noteUuid,
      title: parsed.title,
      ..._placeOf(filePath),
      updatedAt: await _stampOf(filePath),
      contentLength: parsed.content.length,
    },
    sections,
    agents: specAgents(sections[SpecSections.AGENTS]),
  };
};
