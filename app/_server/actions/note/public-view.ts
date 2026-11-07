import type { Note } from "@/app/_types";
import type { PublicTheme } from "@/app/_types/theme";
import type { PublicLinks } from "@/app/_types/relations";
import { ItemTypes } from "@/app/_types/enums";
import { isLegacyUrl } from "@/app/_consts/attachments";
import { getCurrentUser } from "@/app/_server/actions/users";
import { findUserRecord } from "@/app/_server/actions/users/records";
import { isPublicItem } from "@/app/_server/actions/share/queries";
import { ownerThemeFor } from "@/app/_server/actions/config/owner-theme";
import { publicLinksFor } from "@/app/_server/actions/relations/public";
import { PublicUser, sanitizeUserForPublic } from "@/app/_utils/user-sanitize-utils";
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

const _mayView = async (note: Note): Promise<boolean> => {
  if (await isPublicItem(note.uuid, ItemTypes.NOTE)) return true;
  const viewer = await getCurrentUser();
  return Boolean(viewer?.username && viewer.username === note.owner);
};

export const loadPublicNote = async (uuid: string): Promise<PublicNotePayload | null> => {
  const note = await getNoteById(uuid);
  if (!note?.owner || !(await _mayView(note))) return null;

  const owner = await findUserRecord(note.owner);
  const [theme, links] = await Promise.all([ownerThemeFor(owner), publicLinksFor(note.uuid)]);

  return {
    note: _shownNote(note),
    user: sanitizeUserForPublic(owner, !isLegacyUrl(owner?.avatarUrl)),
    theme,
    links,
  };
};
