export interface TagInfo {
  name: string;
  displayName: string;
  parent: string | null;
  noteCount: number;
  checklistCount: number;
  totalCount: number;
}

export type TagsIndex = Record<string, TagInfo>;
