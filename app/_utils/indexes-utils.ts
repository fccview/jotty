import { LinkIndex } from "../_server/actions/link";
import { Checklist, ItemType, Note } from "../_types";
import { ItemTypes } from "../_types/enums";
import { encodeCategoryPath } from "./global-utils";

export const createItemMap = (itemsArray: Note[] | Checklist[]) => {
  return itemsArray.reduce(
    (map: Map<string, Note | Checklist>, item: Note | Checklist) => {
      if (item.uuid) {
        map.set(item.uuid, item);
      }
      return map;
    },
    new Map()
  );
};

export const getReferencingItems = (
  uuids: string[],
  map: Map<string, Note | Checklist>,
  type: ItemType
) => {
  return uuids
    .map((uuid) => {
      const item = map.get(uuid);

      if (item) {
        const path = `${encodeCategoryPath(item.category || "Uncategorized")}/${item.id
          }`;
        return {
          type,
          path,
          title: item.title,
          uuid: item.uuid || "",
          category: item.category || "Uncategorized",
          owner: item.owner,
        };
      }
      return null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
};

export const getReferences = (
  linkIndex: LinkIndex | null,
  itemUuid: string | undefined,
  itemCategory: string | undefined,
  itemType: ItemType,
  notes: Partial<Note>[],
  checklists: Partial<Checklist>[]
) => {
  if (!linkIndex || !itemUuid) return [];

  const currentItemData =
    itemType === ItemTypes.NOTE
      ? linkIndex.notes[itemUuid]
      : linkIndex.checklists[itemUuid];

  const items: Array<{
    type: ItemType;
    path: string;
    title: string;
    category: string;
    owner: string | undefined;
  }> = [];

  const notesMap = createItemMap(notes as Note[]);
  const checklistsMap = createItemMap(checklists as Checklist[]);

  if (!currentItemData) return [];

  const referencedNotes = getReferencingItems(
    currentItemData.isReferencedIn.notes,
    notesMap,
    ItemTypes.NOTE
  );

  const referencedChecklists = getReferencingItems(
    currentItemData.isReferencedIn.checklists,
    checklistsMap,
    ItemTypes.CHECKLIST
  );

  items.push(...referencedNotes, ...referencedChecklists);

  return items;
};
