export interface SharedItem {
  id: string;
  type: "checklist" | "note";
  title: string;
  owner: string;
  sharedWith: string[];
  sharedAt: string;
  category?: string;
  filePath: string;
  isPubliclyShared?: boolean;
}

export interface SharingMetadata {
  checklists: Record<string, SharedItem>;
  notes: Record<string, SharedItem>;
}

export interface MostActiveSharer {
  username: string;
  sharedCount: number;
}

export interface GlobalSharing {
  allSharedChecklists: SharedItem[];
  allSharedNotes: SharedItem[];
  sharingStats: {
    totalSharedChecklists: number;
    totalSharedNotes: number;
    totalSharingRelationships: number;
    totalPublicShares: number;
    mostActiveSharers: MostActiveSharer[];
  };
}

export interface GlobalSharingReturn {
  data: GlobalSharing;
  success: boolean;
  error?: string;
}

export interface SharedItemSummary {
  id: string;
  uuid?: string;
  category: string;
}

export interface AllSharedItems {
  notes: SharedItemSummary[];
  checklists: SharedItemSummary[];
  public: {
    notes: SharedItemSummary[];
    checklists: SharedItemSummary[];
  };
}

export interface UserSharedItem {
  id?: string;
  uuid?: string;
  category?: string;
  sharer: string;
}

export interface UserSharedItems {
  notes: UserSharedItem[];
  checklists: UserSharedItem[];
}
