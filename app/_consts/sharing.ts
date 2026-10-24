export const CATEGORY_INFO_FILE = ".category-info.json";
export const LEGACY_ORDER_FILE = ".order.json";
export const LEGACY_SHARING_FILE = ".sharing.json";
export const MIGRATED_SHARING_FILE = ".sharing.json.migrated";

export const PUBLIC_USER = "public";
export const IMPLICIT_MOUNT_PREFIX = "shared-by:";
export const SHARE_CODE_SEPARATOR = ":";
export const SHARED_WITH_KEY = "sharedWith";
export const SHARED_WITH_NONE = "none";
export const NO_SHARED_PARENT = "This item's folder isn't shared";
export const DETACH_LOSSY = "A folder grant can delete without editing, which an item can't store";

export enum ShareDirections {
  WITH_ME = "withMe",
  BY_ME = "byMe",
}
