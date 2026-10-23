import { StampRefusals } from "@/app/_consts/identity";
import { ItemTypes } from "./enums";
import { EncryptionMethod } from "./encryption";
import { SharingPermissions } from "./core";
import type { SaveState } from "@/app/_utils/autosave-utils";

export interface NoteSummary {
  excerpt: string;
  wordCount: number;
}

export interface TemplateSummary {
  uuid: string;
  title: string;
  encrypted: boolean;
  updatedAt: string;
}

export interface NoteBody {
  uuid: string;
  content: string;
}

export interface Note {
  /** @deprecated file-layer slug (on-disk filename), never identity; use uuid */
  id: string;
  uuid: string;
  title: string;
  content: string;
  itemType?: ItemTypes;
  category?: string;
  createdAt: string;
  updatedAt: string;
  owner?: string;
  isShared?: boolean;
  sharedWith?: string | string[];
  sharedFrom?: string;
  permissions?: SharingPermissions;
  isLoose?: boolean;
  rawContent?: string;
  encrypted?: boolean;
  encryptedContent?: string;
  encryptionMethod?: EncryptionMethod;
  tags?: string[];
  extraMetadata?: Record<string, unknown>;
  lockReason?: StampRefusals;
  excerpt?: string;
  wordCount?: number;
}

export interface NoteEditorViewModel {
  title: string;
  setTitle: (title: string) => void;
  category: string;
  setCategory: (category: string) => void;
  editorContent: string;
  isEditing: boolean;
  isEditorVisible: boolean;
  editorKey: number;
  setIsEditing: (isEditing: boolean) => void;
  status: {
    isSaving: boolean;
    isAutoSaving: boolean;
  };
  autosaveState: SaveState | null;
  handleEdit: () => void;
  handleCancel: () => void;
  handleSave: (passphrase?: string) => Promise<boolean | undefined> | void;
  handleDelete: () => void;
  handleEditorContentChange: (
    content: string,
    isMarkdown: boolean,
    isDirty: boolean
  ) => void;
  handleRemoteContentChange: (content: string, isMarkdown: boolean) => void;
  showUnsavedChangesModal: boolean;
  setShowUnsavedChangesModal: (show: boolean) => void;
  handleUnsavedChangesSave: () => void;
  handleUnsavedChangesDiscard: () => void;
  handleUnsavedChangesKeep: () => void;
  derivedMarkdownContent: string;
  handlePrint: () => void;
  isPrinting: boolean;
  setIsPrinting: (isPrinting: boolean) => void;
  isEditingEncrypted: boolean;
  handleEditEncrypted: (
    passphrase: string,
    method: string,
    decryptedContent: string
  ) => void;
  cachePassphrase: (passphrase: string, method: string) => void;
  clearPassphraseCache: () => void;
  getCachedPassphrase: () => string | null;
  getCachedMethod: () => string | null;
}
