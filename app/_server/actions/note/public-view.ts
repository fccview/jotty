import type { Note } from "@/app/_types";
import type { PublicTheme } from "@/app/_types/theme";
import type { PublicLinks } from "@/app/_types/relations";
import { ItemTypes } from "@/app/_types/enums";
import { mayViewPublic, publicExtrasFor } from "@/app/_server/actions/share/public-item";
import { PublicUser } from "@/app/_utils/user-sanitize-utils";
import { getNoteById } from "./queries";

export interface PublicNotePayload {
  note: Note;
  user: PublicUser | null;
  theme: PublicTheme;
  links: PublicLinks;
}

const _shownNote = (note: Note): Note => ({
  id: note.id,
  uuid: note.uuid,
  title: note.title,
  content: note.content,
  category: note.category,
  createdAt: note.createdAt,
  updatedAt: note.updatedAt,
  owner: note.owner,
  encrypted: note.encrypted,
});

export const loadPublicNote = async (uuid: string): Promise<PublicNotePayload | null> => {
  const note = await getNoteById(uuid);
  if (!note?.owner || !(await mayViewPublic(note.uuid, note.owner, ItemTypes.NOTE))) return null;

  const { user, theme, links } = await publicExtrasFor(note.owner, note.uuid);
  return { note: _shownNote(note), user, theme, links };
};
