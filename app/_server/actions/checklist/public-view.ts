import type { Checklist, Item } from "@/app/_types";
import type { PublicTheme } from "@/app/_types/theme";
import type { PublicLinks } from "@/app/_types/relations";
import { ItemTypes, ToggleState } from "@/app/_types/enums";
import { mayViewPublic, publicExtrasFor } from "@/app/_server/actions/share/public-item";
import { PublicUser } from "@/app/_utils/user-sanitize-utils";
import { getListById } from "./queries";

export interface PublicChecklistPayload {
  checklist: Checklist;
  user: PublicUser | null;
  theme: PublicTheme;
  links: PublicLinks;
  ownerShowsEmojis: boolean;
}

const _shownItems = (items: Item[] = []): Item[] =>
  items
    .filter((item) => !item.isArchived)
    .map((item) => ({
      id: item.id,
      text: item.text,
      completed: item.completed,
      order: item.order,
      status: item.status,
      description: item.description,
      priority: item.priority,
      startDate: item.startDate,
      targetDate: item.targetDate,
      recurrence: item.recurrence,
      ...(item.children && { children: _shownItems(item.children) }),
    }));

const _shownList = (list: Checklist): Checklist => ({
  id: list.id,
  uuid: list.uuid,
  title: list.title,
  type: list.type,
  category: list.category,
  items: _shownItems(list.items),
  statuses: list.statuses,
  createdAt: list.createdAt,
  updatedAt: list.updatedAt,
  owner: list.owner,
});

export const loadPublicChecklist = async (uuid: string): Promise<PublicChecklistPayload | null> => {
  const list = await getListById(uuid);
  if (!list?.owner || !(await mayViewPublic(list.uuid, list.owner, ItemTypes.CHECKLIST))) return null;

  const { record, user, theme, links } = await publicExtrasFor(list.owner, list.uuid);
  return {
    checklist: _shownList(list),
    user,
    theme,
    links,
    ownerShowsEmojis: record?.showChecklistEmojis !== ToggleState.DISABLE,
  };
};
