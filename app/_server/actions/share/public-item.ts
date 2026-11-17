import type { User } from "@/app/_types";
import type { ItemType } from "@/app/_types/core";
import type { PublicTheme } from "@/app/_types/theme";
import type { PublicLinks } from "@/app/_types/relations";
import { isLegacyUrl } from "@/app/_consts/attachments";
import { getCurrentUser } from "@/app/_server/actions/users";
import { findUserRecord } from "@/app/_server/actions/users/records";
import { ownerThemeFor } from "@/app/_server/actions/config/owner-theme";
import { publicLinksFor } from "@/app/_server/actions/relations/public";
import { PublicUser, sanitizeUserForPublic } from "@/app/_utils/user-sanitize-utils";
import { isPublicItem } from "./queries";

export interface PublicItemExtras {
  record: User | null;
  user: PublicUser | null;
  theme: PublicTheme;
  links: PublicLinks;
}

export const mayViewPublic = async (uuid: string, owner: string, type: ItemType): Promise<boolean> => {
  if (await isPublicItem(uuid, type)) return true;
  const viewer = await getCurrentUser();
  return Boolean(viewer?.username && viewer.username === owner);
};

export const publicExtrasFor = async (owner: string, uuid: string): Promise<PublicItemExtras> => {
  const record = await findUserRecord(owner);
  const [theme, links] = await Promise.all([ownerThemeFor(record), publicLinksFor(uuid)]);

  return {
    record,
    user: sanitizeUserForPublic(record, !isLegacyUrl(record?.avatarUrl)),
    theme,
    links,
  };
};
