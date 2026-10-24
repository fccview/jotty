import type { AttachmentKinds } from "@/app/_consts/attachments";
import type { ItemTypes } from "@/app/_types/enums";
import type { LinkModes, ResidueKinds } from "@/app/_consts/attachment-migration";

export interface FileItem {
  fileName: string;
  name: string;
  url: string;
  type: `${AttachmentKinds}`;
  mimeType: string;
  size: number;
  uploadedAt: string;
  itemUuid?: string;
  itemTitle?: string;
}

export interface AttachmentFolder {
  itemUuid: string;
  title: string;
  itemType: ItemTypes;
  count: number;
  size: number;
  updatedAt: string;
}

export interface AttachmentPage<T> {
  entries: T[];
  hasMore: boolean;
}

export interface AttachmentMigrationReport {
  dryRun: boolean;
  items: number;
  rewritten: number;
  urls: number;
  linked: number;
  copied: number;
  reused: number;
  avatars: number;
  uuids: number;
  passes: number;
  linkMode: LinkModes;
  copyBytes: number;
  freeBytes: number | null;
  crossOwner: string[];
  residue: Partial<Record<ResidueKinds, string[]>>;
}
