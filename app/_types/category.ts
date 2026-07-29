import { SharingPermissions } from "./core";

export interface Category {
  name: string;
  count: number;
  path: string;
  parent?: string;
  level: number;
  uuid?: string;
  sharedFrom?: string;
  permissions?: SharingPermissions;
  sharedWith?: Record<string, SharingPermissions>;
}
