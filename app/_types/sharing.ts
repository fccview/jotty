import { SharingPermissions } from "./core";
import { Modes } from "./enums";

export interface CategorySharing {
  users: Record<string, SharingPermissions>;
  inherit: boolean;
}

export interface CategoryOrder {
  categories?: string[];
  items?: string[];
}

export interface CategoryInfo {
  uuid?: string;
  sharing?: CategorySharing;
  order?: CategoryOrder;
}

export interface ShareGrant {
  username: string;
  permissions: SharingPermissions;
}

export interface EffectiveAccess {
  owner: string;
  users: Record<string, SharingPermissions>;
  isPublic: boolean;
  inherited: boolean;
  viaCategory?: string;
}

export interface SharedMount {
  owner: string;
  mode: Modes;
  categoryUuid: string;
  categoryPath: string;
  displayName: string;
  permissions: SharingPermissions;
  isImplicit: boolean;
  itemUuids?: string[];
}

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
  uuid: string;
}

export interface ShareEntry {
  uuid: string;
  sharer: string;
  permissions: SharingPermissions;
}

export type SharingData = Record<string, ShareEntry[]>;

export interface ItemShares {
  users: Record<string, SharingPermissions>;
  isPublic: boolean;
  inherited: boolean;
  viaCategory?: string;
}

export interface FolderShares {
  users: Record<string, SharingPermissions>;
  isPublic: boolean;
  inherit: boolean;
  uuid?: string;
}

export interface GlobalShares {
  notes: SharingData;
  checklists: SharingData;
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
  uuid?: string;
  /** @deprecated legacy on-disk field, ignored; entries are matched by uuid */
  id?: string;
  /** @deprecated legacy on-disk field, ignored; entries are matched by uuid */
  category?: string;
  sharer: string;
}

export interface UserSharedItems {
  notes: UserSharedItem[];
  checklists: UserSharedItem[];
}
