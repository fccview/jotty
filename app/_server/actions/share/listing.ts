import { PUBLIC_USER, ShareDirections } from "@/app/_consts/sharing";
import { ItemTypes } from "@/app/_types/enums";
import type { SanitisedUser, SharingPermissions } from "@/app/_types";
import type { ShareListing } from "@/app/_types/sharing";
import { visibleItems } from "@/app/_server/actions/relations/queries";
import { sharesInvolving } from "./queries";

interface ShareFilters {
  direction?: ShareDirections;
  type?: ItemTypes;
  item?: string;
  user?: string;
}

const _involves = (listing: ShareListing, user: string): boolean =>
  listing.direction === ShareDirections.WITH_ME
    ? listing.owner === user
    : Boolean(listing.people?.some(([username]) => username === user));

const _matches = (listing: ShareListing, { direction, type, item, user }: ShareFilters): boolean =>
  (!direction || listing.direction === direction) &&
  (!type || listing.type === type) &&
  (!item || listing.uuid.toLowerCase() === item.toLowerCase()) &&
  (!user || _involves(listing, user));

export const grantsView = (uuid: string, type: ItemTypes, grants: Record<string, SharingPermissions>) => ({
  id: uuid,
  type,
  isPublic: Boolean(grants[PUBLIC_USER]),
  sharedWith: Object.entries(grants)
    .filter(([username]) => username !== PUBLIC_USER)
    .map(([username, permissions]) => ({ username, permissions })),
});

const _named = (listing: ShareListing, title: string, category: string) => ({
  uuid: listing.uuid,
  type: listing.type,
  title,
  category,
  owner: listing.owner,
  direction: listing.direction,
  viaCategory: listing.viaCategory,
  permissions: listing.permissions,
  isPublic: listing.isPublic,
  sharedWith: listing.people
    ?.filter(([username]) => username !== PUBLIC_USER)
    .map(([username, permissions]) => ({ username, permissions })),
});

export const sharesFor = async (actor: SanitisedUser, filters: ShareFilters) => {
  const [listings, visible] = await Promise.all([
    sharesInvolving(actor.username),
    visibleItems(actor.username),
  ]);

  return listings
    .filter((listing) => _matches(listing, filters))
    .flatMap((listing) => {
      const item = visible.get(listing.uuid.toLowerCase());
      return item ? [_named(listing, item.title, item.category)] : [];
    })
    .sort((a, b) => a.direction.localeCompare(b.direction) || a.title.localeCompare(b.title));
};

export const shareTarget = async (actor: SanitisedUser, itemId: string) =>
  (await visibleItems(actor.username)).get(itemId.toLowerCase());
