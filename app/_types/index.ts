import { TaskStatus } from "./enums";

export type ChecklistType = "simple" | "task";

export interface TimeEntry {
  id: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

export type ItemType = "checklist" | "note";

export interface Item {
  id: string;
  category?: string;
  text: string;
  completed: boolean;
  order: number;
  status?: TaskStatus;
  timeEntries?: TimeEntry[];
  estimatedTime?: number;
  targetDate?: string;
}

export interface List {
  id: string;
  title: string;
  category?: string;
  items: Item[];
}

export interface Checklist {
  id: string;
  title: string;
  type: ChecklistType;
  category?: string;
  items: Item[];
  createdAt: string;
  updatedAt: string;
  owner?: string;
  isShared?: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  owner?: string;
  isShared?: boolean;
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
  handleSave: () => void;
  handleDelete: () => void;
  handleEditorContentChange: (content: string, isMarkdown: boolean) => void;
  showUnsavedChangesModal: boolean;
  setShowUnsavedChangesModal: (show: boolean) => void;
  handleUnsavedChangesSave: () => void;
  handleUnsavedChangesDiscard: () => void;
  derivedMarkdownContent: string;
}

export interface Category {
  name: string;
  count: number;
  path: string;
  parent?: string;
  level: number;
}

export interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface User {
  username: string;
  passwordHash: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  createdAt?: string;
  lastLogin?: string;
  apiKey?: string;
  avatarUrl?: string;
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

export interface SharingPermissions {
  canRead: boolean;
  canWrite: boolean;
  canShare: boolean;
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

export interface EmojiDictionary {
  [key: string]: string;
}

export type AppMode = "checklists" | "notes";

export interface MostActiveSharer {
  username: string;
  sharedCount: number;
}

export interface AppSettings {
  appName: string;
  appDescription: string;
  "16x16Icon": string;
  "32x32Icon": string;
  "180x180Icon": string;
}

export interface Session {
  id: string;
  userAgent: string;
  ipAddress: string;
  lastActivity: string;
  isCurrent: boolean;
  loginType?: "local" | "sso";
}

export interface ExportProgress {
  progress: number;
  message: string;
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
}

export type ExportType =
  | "all_checklists_notes"
  | "user_checklists_notes"
  | "all_users_data"
  | "whole_data_folder";
