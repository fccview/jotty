import { SharingPermissions, ItemType } from "@/app/_types/core";

interface SharedItemEntry {
  uuid?: string;
  id?: string;
  category?: string;
  sharer: string;
  permissions: SharingPermissions;
}

interface SharingItemUpdate {
  uuid?: string;
  id?: string;
  category?: string;
  itemType: ItemType;
  sharer?: string;
}

type SharingData = Record<string, SharedItemEntry[]>;

export type { SharedItemEntry, SharingItemUpdate, SharingData };
