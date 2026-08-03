export type ItemType = "checklist" | "note";

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SharingPermissions {
  canRead: boolean;
  canEdit: boolean;
  canDelete: boolean;
  /** Folder-scope only: place new or moved items inside the shared folder. */
  canCreate?: boolean;
}
