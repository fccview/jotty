import yaml from "js-yaml";
import { OwnedMetaKeys } from "@/app/_utils/yaml-metadata-utils";

export enum FrontmatterWarnings {
  UUID = "uuid",
  SHARING = "sharedWith",
  ENCRYPTION = "encryption",
  LIST_TYPE = "checklistType",
  COLUMNS = "statuses",
}

const WATCHED: Record<FrontmatterWarnings, string[]> = {
  [FrontmatterWarnings.UUID]: [OwnedMetaKeys.UUID],
  [FrontmatterWarnings.SHARING]: [OwnedMetaKeys.SHARED_WITH],
  [FrontmatterWarnings.ENCRYPTION]: [OwnedMetaKeys.ENCRYPTED, OwnedMetaKeys.ENCRYPTION_METHOD],
  [FrontmatterWarnings.LIST_TYPE]: [OwnedMetaKeys.CHECKLIST_TYPE],
  [FrontmatterWarnings.COLUMNS]: [OwnedMetaKeys.STATUSES],
};

const _load = (text: string): Record<string, unknown> | null => {
  try {
    const parsed = yaml.load(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return null;
  }
};

const _same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export const frontmatterWarnings = (before: string, after: string): FrontmatterWarnings[] => {
  const was = _load(before);
  const now = _load(after);
  if (!was || !now) return [];
  return Object.values(FrontmatterWarnings).filter((warning) =>
    WATCHED[warning].some((key) => !_same(was[key], now[key])),
  );
};
