import { SharingPermissions, ItemType } from "@/app/_types/core";

interface SharedItemEntry {
  uuid?: string;
  /** @deprecated legacy on-disk field, ignored; entries are matched by uuid */
  id?: string;
  /** @deprecated legacy on-disk field, ignored; entries are matched by uuid */
  category?: string;
  sharer: string;
  permissions: SharingPermissions;
}

interface SharingItemUpdate {
  uuid?: string;
  itemType: ItemType;
  sharer?: string;
}

type SharingData = Record<string, SharedItemEntry[]>;

export type { SharedItemEntry, SharingItemUpdate, SharingData };
