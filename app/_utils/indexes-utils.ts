import { LinkIndex } from "../_server/actions/link";
import { Checklist, Note } from "../_types";

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
  type: "note" | "checklist"
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
  itemType: "note" | "checklist",
  notes: Partial<Note>[],
  checklists: Partial<Checklist>[]
) => {
  if (!linkIndex || !itemId) return [];

  const itemKey = `${itemCategory || "Uncategorized"}/${itemId}`;
  const currentItemData =
    itemType === "note"
      ? linkIndex.notes[itemKey]
      : linkIndex.checklists[itemKey];

  const items: Array<{
    type: "note" | "checklist";
    path: string;
    title: string;
    category: string;
  }> = [];

  const notesMap = createItemMap(notes as Note[]);
  const checklistsMap = createItemMap(checklists as Checklist[]);

  if (!currentItemData) return [];

  const referencedNotes = getReferencingItems(
    currentItemData.isReferencedIn.notes,
    notesMap,
    "note"
  );

  const referencedChecklists = getReferencingItems(
    currentItemData.isReferencedIn.checklists,
    checklistsMap,
    "checklist"
  );

  items.push(...referencedNotes, ...referencedChecklists);

  return items;
};
