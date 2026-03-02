import { ItemTypes } from "./enums";
import { EncryptionMethod } from "./encryption";

export interface Note {
  id: string;
  uuid?: string;
  title: string;
  content: string;
  itemType?: ItemTypes;
  category?: string;
  createdAt: string;
  updatedAt: string;
  owner?: string;
  isShared?: boolean;
  rawContent?: string;
  encrypted?: boolean;
  encryptedContent?: string;
  encryptionMethod?: EncryptionMethod;
  tags?: string[];
}

export interface NoteEditorViewModel {
  title: string;
  setTitle: (title: string) => void;
  category: string;
  setCategory: (category: string) => void;
  editorContent: string;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  status: {
    isSaving: boolean;
    isAutoSaving: boolean;
  };
  handleEdit: () => void;
  handleCancel: () => void;
  handleSave: (autosaveNotes?: boolean, passphrase?: string) => void;
  handleDelete: () => void;
  handleEditorContentChange: (
    content: string,
    isMarkdown: boolean,
    isDirty: boolean
  ) => void;
  showUnsavedChangesModal: boolean;
  setShowUnsavedChangesModal: (show: boolean) => void;
  handleUnsavedChangesSave: () => void;
  handleUnsavedChangesDiscard: () => void;
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
}
