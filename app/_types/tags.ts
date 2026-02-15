export interface TagInfo {
  name: string;
  displayName: string;
  parent: string | null;
  noteUuids: string[];
  totalCount: number;
}

export type TagsIndex = Record<string, TagInfo>;
