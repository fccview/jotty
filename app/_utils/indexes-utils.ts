import { LinkIndex } from "../_server/actions/link";
import { Checklist, ItemType, Note } from "../_types";
import { ItemTypes } from "../_types/enums";
import { encodeCategoryPath } from "./global-utils";

export const createItemMap = (itemsArray: Note[] | Checklist[]) => {
  return itemsArray.reduce(
    (map: Map<string, Note | Checklist>, item: Note | Checklist) => {
      const itemKey = `${item.category || "Uncategorized"}/${item.id}`;
      map.set(itemKey, item);
      return map;
    },
    new Map()
  );
};

export const getReferencingItems = (
  keys: string[],
  map: Map<string, Note | Checklist>,
  type: ItemType
) => {
  return keys
    .map((key) => {
      const item = map.get(key);

      if (item) {
        return {
          type,
          path: key,
          title: item.title,
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
  itemId: string | undefined,
  itemCategory: string | undefined,
  itemType: ItemType,
  notes: Partial<Note>[],
  checklists: Partial<Checklist>[]
) => {
  if (!linkIndex || !itemId) return [];

  const itemKey = `${encodeCategoryPath(itemCategory || "Uncategorized")}/${itemId}`;
  const currentItemData =
    itemType === ItemTypes.NOTE
      ? linkIndex.notes[itemKey]
      : linkIndex.checklists[itemKey];

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
