import { PUBLIC_USER, ShareDirections } from "@/app/_consts/sharing";
import { ItemTypes } from "@/app/_types/enums";
import type { SanitisedUser } from "@/app/_types";
import type { ShareListing } from "@/app/_types/sharing";
import { visibleItems } from "@/app/_server/actions/relations/queries";
import { sharesInvolving } from "./queries";

interface ShareFilters {
  direction?: ShareDirections;
  type?: ItemTypes;
}

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

export const sharesFor = async (actor: SanitisedUser, { direction, type }: ShareFilters) => {
  const [listings, visible] = await Promise.all([
    sharesInvolving(actor.username),
    visibleItems(actor.username),
  ]);

  return listings
    .filter((listing) => (!direction || listing.direction === direction) && (!type || listing.type === type))
    .flatMap((listing) => {
      const item = visible.get(listing.uuid.toLowerCase());
      return item ? [_named(listing, item.title, item.category)] : [];
    })
    .sort((a, b) => a.direction.localeCompare(b.direction) || a.title.localeCompare(b.title));
};
