import { cookies } from "next/headers";
import { Note, SanitisedUser } from "@/app/_types";
import { BodyCookie, DEFAULT_ITEMS_PER_PAGE, NOTE_BODIES_COOKIE } from "@/app/_consts/browse";
import { firstNotesPage } from "@/app/_utils/browse-utils";
import { isNoteEncrypted } from "@/app/_utils/note-display-utils";
import { bodyNeedOf, isBodyCookie } from "@/app/_utils/browse/body-cookie";
import { QuickSettingId, accountValueOf } from "@/app/_consts/quick-settings";

const PAGE_SIZES: Record<BodyCookie, number> = {
  [BodyCookie.ON]: DEFAULT_ITEMS_PER_PAGE,
  [BodyCookie.SELECTED]: 1,
  [BodyCookie.OFF]: 0,
};

export const firstPageBodies =
  (user: SanitisedUser | null, wanted: BodyCookie) =>
  (notes: Note[]): string[] =>
    firstNotesPage(
      notes,
      user?.defaultNoteFilter || "all",
      user?.pinnedNotes || [],
      DEFAULT_ITEMS_PER_PAGE,
    )
      .slice(0, PAGE_SIZES[wanted])
      .filter((note) => !isNoteEncrypted(note))
      .map((note) => note.uuid);

export const accountWantsBodies = (user: SanitisedUser | null): BodyCookie =>
  bodyNeedOf({
    showMarkdownPreview: accountValueOf(QuickSettingId.CARD_PREVIEW, user),
    viewMode: accountValueOf(QuickSettingId.VIEW_MODE, user),
    isDesktop: true,
  });

export const wantedBodies = async (user: SanitisedUser | null): Promise<BodyCookie> => {
  const cookie = (await cookies()).get(NOTE_BODIES_COOKIE)?.value;
  return isBodyCookie(cookie) ? cookie : accountWantsBodies(user);
};

export const everyBody = (notes: Note[]): string[] => notes.map((note) => note.uuid);
