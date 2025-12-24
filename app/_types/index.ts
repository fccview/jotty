import { Modes, ItemTypes } from "./enums";
import { LinkIndex } from "../_server/actions/link";

export type ChecklistType = "simple" | "task";
export type ItemType = "checklist" | "note";
export type EncryptionMethod = "pgp" | "xchacha";

export interface PGPKeyMetadata {
  keyFingerprint: string;
  createdAt: string;
  algorithm: string;
}

export interface EncryptionSettings {
  method: EncryptionMethod;
  autoDecrypt: boolean;
  hasKeys: boolean;
  customKeyPath?: string;
}

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
  status: string;
  timestamp: string;
  user: string;
}

export interface KanbanStatus {
  id: string;
  label: string;
  color?: string;
  order: number;
}

export interface Item {
  id: string;
  category?: string;
  text: string;
  completed: boolean;
  order: number;
  status?: string;
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
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  previousStatus?: string;
}

export interface List {
  id: string;
  title: string;
  category?: string;
  items: Item[];
}

export interface Checklist {
  id: string;
  uuid?: string;
  title: string;
  type: ChecklistType;
  category?: string;
  items: Item[];
  createdAt: string;
  updatedAt: string;
  owner?: string;
  isShared?: boolean;
  itemType?: ItemTypes;
  isDeleted?: boolean;
  rawContent?: string;
  statuses?: KanbanStatus[];
}

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
  fileRenameMode?: FileRenameMode;
  preferredDateFormat: PreferredDateFormat;
  preferredTimeFormat: PreferredTimeFormat;
  disableRichEditor?: DisableRichEditor;
  markdownTheme?: MarkdownTheme;
  encryptionSettings?: EncryptionSettings;
  defaultChecklistFilter?: DefaultChecklistFilter;
  defaultNoteFilter?: DefaultNoteFilter;
  quickCreateNotes?: QuickCreateNotes;
  quickCreateNotesCategory?: string;
}

export type EnableRecurrence = "enable" | "disable";
export type ShowCompletedSuggestions = "enable" | "disable";
export type ImageSyntax = "html" | "markdown";
export type TableSyntax = "html" | "markdown";
export type NotesDefaultEditor = "wysiwyg" | "markdown";
export type LandingPage = Modes.CHECKLISTS | Modes.NOTES | "last-visited";
export type MarkdownTheme =
  | "prism"
  | "prism-dark"
  | "prism-funky"
  | "prism-okaidia"
  | "prism-tomorrow"
  | "prism-twilight"
  | "prism-coy"
  | "prism-solarizedlight";
export type NotesDefaultMode = "edit" | "view";
export type NotesAutoSaveInterval = 0 | 1000 | 5000 | 10000 | 15000 | 20000;
export type FileRenameMode = "dash-case" | "minimal" | "none";
export type PreferredDateFormat = "dd/mm/yyyy" | "mm/dd/yyyy";
export type PreferredTimeFormat = "12-hours" | "24-hours";
export type DisableRichEditor = "enable" | "disable";
export type DefaultChecklistFilter =
  | "all"
  | "completed"
  | "incomplete"
  | "pinned"
  | "task"
  | "simple";
export type DefaultNoteFilter = "all" | "recent" | "pinned";
export type QuickCreateNotes = "enable" | "disable";

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

export type EmojiMatchMode =
  | "exact"
  | "word"
  | "prefix"
  | "suffix"
  | "substring";

export interface EmojiConfig {
  emoji: string;
  match: EmojiMatchMode;
  caseSensitive?: boolean;
}

export interface EmojiDictionary {
  [key: string]: EmojiConfig | string;
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
  parseContent: "yes" | "no";
  maximumFileSize: number;
  editor: {
    enableSlashCommands: boolean;
    enableBubbleMenu: boolean;
    enableTableToolbar: boolean;
    enableBilateralLinks: boolean;
    drawioUrl?: string;
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

export interface SharedItemSummary {
  id: string;
  uuid?: string;
  category: string;
}

export interface AllSharedItems {
  notes: SharedItemSummary[];
  checklists: SharedItemSummary[];
  public: {
    notes: SharedItemSummary[];
    checklists: SharedItemSummary[];
  };
}

export interface UserSharedItem {
  id?: string;
  uuid?: string;
  category?: string;
  sharer: string;
}

export interface UserSharedItems {
  notes: UserSharedItem[];
  checklists: UserSharedItem[];
}

export interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  selectedNote: string | null;
  setSelectedNote: (id: string | null) => void;
  isInitialized: boolean;
  isDemoMode: boolean;
  isRwMarkable: boolean;
  user: User | null;
  setUser: (user: User | null) => void;
  appVersion: string;
  appSettings: AppSettings | null;
  usersPublicData: Partial<User>[];
  linkIndex: LinkIndex | null;
  notes: Partial<Note>[];
  checklists: Partial<Checklist>[];
  allSharedItems: AllSharedItems | null;
  userSharedItems: UserSharedItems | null;
  globalSharing: any;
}

export type AuditLogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export type AuditCategory =
  | "auth"
  | "user"
  | "checklist"
  | "note"
  | "sharing"
  | "settings"
  | "encryption"
  | "api"
  | "system";

export type AuditAction =
  | "login"
  | "logout"
  | "register"
  | "session_terminated"
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "profile_updated"
  | "checklist_created"
  | "checklist_updated"
  | "checklist_deleted"
  | "checklist_item_checked"
  | "checklist_item_unchecked"
  | "checklist_archived"
  | "checklist_restored"
  | "note_created"
  | "note_updated"
  | "note_deleted"
  | "note_archived"
  | "note_restored"
  | "note_encrypted"
  | "note_decrypted"
  | "item_shared"
  | "item_unshared"
  | "share_permissions_updated"
  | "settings_updated"
  | "theme_changed"
  | "preferences_updated"
  | "api_key_generated"
  | "api_request"
  | "export_created"
  | "logs_cleaned";

export interface AuditMetadata {
  [key: string]: any;
  oldValue?: any;
  newValue?: any;
  changes?: string[];
  targetUser?: string;
}

export interface AuditLogEntry {
  id: string;
  uuid: string;
  timestamp: string;
  level: AuditLogLevel;
  username: string;
  action: AuditAction;
  category: AuditCategory;
  resourceType?: string;
  resourceId?: string;
  resourceTitle?: string;
  metadata?: AuditMetadata;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
  duration?: number;
}

export interface AuditLogFilters {
  username?: string;
  action?: AuditAction;
  category?: AuditCategory;
  level?: AuditLogLevel;
  startDate?: string;
  endDate?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export interface AuditLogStats {
  totalLogs: number;
  logsByLevel: Record<AuditLogLevel, number>;
  logsByCategory: Record<AuditCategory, number>;
  topActions: { action: string; count: number }[];
  topUsers: { username: string; count: number }[];
  recentActivity: AuditLogEntry[];
}
