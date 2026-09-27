import path from "path";
import { ARCHIVED_DIR_NAME, DATA_DIR, EXCLUDED_DIRS } from "@/app/_consts/files";
import { ItemTypes, Modes } from "@/app/_types/enums";

export interface ItemFileInfo {
  owner: string;
  type: ItemTypes;
}

const MODE_TYPES: Record<string, ItemTypes> = {
  [Modes.NOTES]: ItemTypes.NOTE,
  [Modes.CHECKLISTS]: ItemTypes.CHECKLIST,
};

export const dataRoot = (): string => path.join(process.cwd(), DATA_DIR);

export const itemTreeRoots = (): string[] =>
  Object.keys(MODE_TYPES).map((mode) => path.join(dataRoot(), mode));

const _hiddenDir = (segment: string): boolean =>
  EXCLUDED_DIRS.includes(segment) ||
  (segment.startsWith(".") && segment !== ARCHIVED_DIR_NAME);

export const itemFileInfo = (filePath: string): ItemFileInfo | null => {
  if (!filePath.endsWith(".md")) return null;

  const rel = path.relative(dataRoot(), path.resolve(filePath));
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;

  const segments = rel.split(path.sep);
  const type = MODE_TYPES[segments[0]];
  if (!type || segments.length < 3) return null;

  const folders = segments.slice(2, -1);
  if (folders.some(_hiddenDir)) return null;

  return { owner: segments[1], type };
};

export const isItemFile = (filePath: string): boolean =>
  itemFileInfo(filePath) !== null;
