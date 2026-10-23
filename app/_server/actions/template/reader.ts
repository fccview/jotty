import path from "path";
import { Note } from "@/app/_types";
import { NOTES_DIR, TEMPLATES_DIR_NAME } from "@/app/_consts/files";
import { readNotesRecursively } from "@/app/_server/actions/note/readers";
import { getNoteById } from "@/app/_server/actions/note/queries";
import { isTemplateCategory } from "@/app/_utils/template-utils";

const _templatesDir = (username: string): string =>
  path.join(process.cwd(), NOTES_DIR(username), TEMPLATES_DIR_NAME);

const _inTemplates = (category?: string): string =>
  category ? `${TEMPLATES_DIR_NAME}/${category}` : TEMPLATES_DIR_NAME;

export const listTemplates = async (username: string): Promise<Note[]> => {
  const found = await readNotesRecursively(_templatesDir(username), username, {
    metadataOnly: true,
  });

  return found
    .map(({ sourcePath: _sourcePath, ...note }) => ({
      ...note,
      category: _inTemplates(note.category),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
};

export const ownTemplate = async (
  username: string,
  uuid: string,
): Promise<Note | null> => {
  const note = await getNoteById(uuid, username);
  if (!note || note.isShared) return null;
  if (note.owner && note.owner !== username) return null;
  return isTemplateCategory(note.category) ? note : null;
};
