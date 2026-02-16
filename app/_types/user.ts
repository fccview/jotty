import { Modes } from "./enums";
import { EncryptionSettings } from "./encryption";

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
export type PreferredDateFormat = "dd/mm/yyyy" | "mm/dd/yyyy" | "yyyy/mm/dd";
export type PreferredTimeFormat = "12-hours" | "24-hours";
export type Handedness = "right-handed" | "left-handed";
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
export type HideConnectionIndicator = "enable" | "disable";
export type CodeBlockStyle = "default" | "themed";

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
  handedness?: Handedness;
  disableRichEditor?: DisableRichEditor;
  markdownTheme?: MarkdownTheme;
  encryptionSettings?: EncryptionSettings;
  defaultChecklistFilter?: DefaultChecklistFilter;
  defaultNoteFilter?: DefaultNoteFilter;
  quickCreateNotes?: QuickCreateNotes;
  quickCreateNotesCategory?: string;
  hideConnectionIndicator?: HideConnectionIndicator;
  codeBlockStyle?: CodeBlockStyle;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  mfaRecoveryCode?: string;
  mfaEnrolledAt?: string;
  preferredLocale?: string;
  failedLoginAttempts?: number;
  nextAllowedLoginAttempt?: string;
}

export interface Session {
  id: string;
  userAgent: string;
  ipAddress: string;
  lastActivity: string;
  isCurrent: boolean;
  loginType?: "local" | "sso" | "pending-mfa";
}

export type SanitisedUser = Omit<
  User,
  "passwordHash" | "apiKey" | "lastLogin" | "mfaSecret" | "mfaRecoveryCode"
>;
