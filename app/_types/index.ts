import { TaskStatus, Modes } from "./enums";

export type ChecklistType = "simple" | "task";
export type ItemType = "checklist" | "note";

export interface TimeEntry {
  id: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

export interface RecurrenceRule {
  rrule: string;
  dtstart: string;
  until?: string;
  nextDue?: string;
  lastCompleted?: string;
}

export interface StatusChange {
  status: TaskStatus;
  timestamp: string;
  user: string;
}

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
  children?: Item[];
  createdBy?: string;
  createdAt?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  history?: StatusChange[];
  description?: string;
  recurrence?: RecurrenceRule;
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
  isDeleted?: boolean;
  rawContent?: string;
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
  rawContent?: string;
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
  handlePrint: () => void;
  isPrinting: boolean;
  setIsPrinting: (isPrinting: boolean) => void;
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
  preferredTheme?: string;
  imageSyntax?: ImageSyntax;
  tableSyntax?: TableSyntax;
  landingPage?: LandingPage;
  notesAutoSaveInterval?: NotesAutoSaveInterval;
  notesDefaultEditor?: NotesDefaultEditor;
  notesDefaultMode?: NotesDefaultMode;
  pinnedLists?: string[];
  pinnedNotes?: string[];
  enableRecurrence?: EnableRecurrence;
  showCompletedSuggestions?: ShowCompletedSuggestions;
}

export type EnableRecurrence = "enable" | "disable";
export type ShowCompletedSuggestions = "enable" | "disable";
export type ImageSyntax = "html" | "markdown";
export type TableSyntax = "html" | "markdown";
export type NotesDefaultEditor = "wysiwyg" | "markdown";
export type LandingPage = Modes.CHECKLISTS | Modes.NOTES | "last-visited";
export type NotesDefaultMode = "edit" | "view";
export type NotesAutoSaveInterval = 0 | 1000 | 5000 | 10000 | 15000 | 20000;

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
  canEdit: boolean;
  canDelete: boolean;
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
  "512x512Icon": string;
  "192x192Icon": string;
  notifyNewUpdates: "yes" | "no";
  maximumFileSize: number;
  editor: {
    enableSlashCommands: boolean;
    enableBubbleMenu: boolean;
    enableTableToolbar: boolean;
    enableBilateralLinks: boolean;
  };
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
