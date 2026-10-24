import path from "path";
import { DATA_DIR } from "@/app/_consts/files";
import { isUuid } from "@/app/_consts/identity";
import { ItemTypes, Modes, PermissionTypes } from "@/app/_types/enums";
import { grepFindFileByUuid } from "@/app/_utils/grep-utils";
import { canReach, isPublicItem } from "@/app/_server/actions/share/queries";

export interface AttachedItem {
  uuid: string;
  type: ItemTypes;
  mode: Modes;
  filePath: string;
  owner: string;
}

const SEARCHED: [Modes, ItemTypes][] = [
  [Modes.NOTES, ItemTypes.NOTE],
  [Modes.CHECKLISTS, ItemTypes.CHECKLIST],
];

export const locateItem = async (uuid: string): Promise<AttachedItem | null> => {
  if (!isUuid(uuid)) return null;

  for (const [mode, type] of SEARCHED) {
    const root = path.join(process.cwd(), DATA_DIR, mode);
    const found = await grepFindFileByUuid(root, uuid);
    if (!found) continue;

    const owner = path.relative(root, found.filePath).split(path.sep)[0];
    return { uuid, type, mode, filePath: found.filePath, owner };
  }

  return null;
};

export const mayView = async (
  item: AttachedItem,
  viewer: string | null,
): Promise<boolean> => {
  if (viewer && (await canReach(item.uuid, item.type, viewer, PermissionTypes.READ))) {
    return true;
  }
  return isPublicItem(item.uuid, item.type);
};

export const mayDo = (
  item: AttachedItem,
  username: string,
  wanted: PermissionTypes,
): Promise<boolean> =>
  wanted === PermissionTypes.READ
    ? mayView(item, username)
    : canReach(item.uuid, item.type, username, wanted);
