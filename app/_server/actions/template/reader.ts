import path from "path";
import { Note, TemplateSummary } from "@/app/_types";
import { NOTES_DIR, TEMPLATES_DIR_NAME } from "@/app/_consts/files";
import { serverReadFile } from "@/app/_server/actions/file";
import { readNotesRecursively } from "@/app/_server/actions/note/readers";
import { parseMarkdownNote } from "@/app/_server/actions/note/parsers";
import { grepFindFileByUuid } from "@/app/_utils/grep-utils";

const _templatesDir = (username: string): string =>
  path.join(process.cwd(), NOTES_DIR(username), TEMPLATES_DIR_NAME);

const _inTemplates = (category?: string): string =>
  category ? `${TEMPLATES_DIR_NAME}/${category}` : TEMPLATES_DIR_NAME;

export const listTemplates = async (username: string): Promise<TemplateSummary[]> => {
  const found = await readNotesRecursively(_templatesDir(username), username, {
    metadataOnly: true,
  });

  return found
    .filter((note) => note.uuid)
    .map(({ uuid, title, encrypted, updatedAt }) => ({
      uuid,
      title,
      encrypted: Boolean(encrypted),
      updatedAt,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
};

export const ownTemplate = async (
  username: string,
  uuid: string,
): Promise<Note | null> => {
  const found = await grepFindFileByUuid(_templatesDir(username), uuid);
  if (!found) return null;

  const content = await serverReadFile(found.filePath);
  if (!content) return null;

  return parseMarkdownNote(
    content,
    found.id,
    _inTemplates(found.category),
    username,
    false,
    undefined,
    path.basename(found.filePath),
  );
};
