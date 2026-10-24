import { ToggleState, Modes } from "./enums";
import { EncryptionSettings } from "./encryption";
import type { SearchModes } from "@/app/_consts/search";
import type { CHECKLIST_FILTERS, NOTE_FILTERS } from "@/app/_consts/browse";
import type { HomeWidgetKey } from "@/app/_consts/home";
import type { ViewMode } from "@/app/_consts/view-modes";

export type EnableRecurrence = `${ToggleState}`;
export type ShowCompletedSuggestions = `${ToggleState}`;
export type ShowChecklistEmojis = `${ToggleState}`;
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
export type PreferredDateFormat =
  | "dd/mm/yyyy"
  | "mm/dd/yyyy"
  | "yyyy/mm/dd"
  | "system";
export type PreferredTimeFormat = "12-hours" | "24-hours" | "system";
export type FirstDayOfWeek = "sunday" | "monday" | "saturday";
export type Handedness = "right-handed" | "left-handed";
export type DisableRichEditor = `${ToggleState}`;
export type DefaultChecklistFilter = (typeof CHECKLIST_FILTERS)[number];
export type DefaultNoteFilter = (typeof NOTE_FILTERS)[number];
export type QuickCreateNotes = `${ToggleState}`;
export type HideConnectionIndicator = `${ToggleState}`;
export type HideStatusOnCards = `${ToggleState}`;
export type HideMobileStatusDropdown = `${ToggleState}`;
export type HideTimeTrackingOnCards = `${ToggleState}`;
export type CodeBlockStyle = "default" | "themed";
export type ChecklistItemClickAction = "toggle" | "edit";
export type NewItemInsertion = "top" | "bottom";
export type NotesCardPreview = `${ToggleState}`;
export type NotesCompactMode = `${ToggleState}`;
export type NotesDetailsPanel = `${ToggleState}`;

export interface User extends Partial<Record<HomeWidgetKey, ToggleState>> {
  uuid?: string;
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
  notesFontSize?: number;
  notesCardPreview?: NotesCardPreview;
  notesCompactMode?: NotesCompactMode;
  notesDetailsPanel?: NotesDetailsPanel;
  preferredBorderRadius?: number;
  kanbanColumnWidth?: number;
  browseViewMode?: ViewMode;
  pinnedLists?: string[];
  pinnedNotes?: string[];
  enableRecurrence?: EnableRecurrence;
  showCompletedSuggestions?: ShowCompletedSuggestions;
  showChecklistEmojis?: ShowChecklistEmojis;
  fileRenameMode?: FileRenameMode;
  preferredDateFormat: PreferredDateFormat;
  preferredTimeFormat: PreferredTimeFormat;
  firstDayOfWeek?: FirstDayOfWeek;
  handedness?: Handedness;
  disableRichEditor?: DisableRichEditor;
  markdownTheme?: MarkdownTheme;
  encryptionSettings?: EncryptionSettings;
  defaultChecklistFilter?: DefaultChecklistFilter;
  checklistItemClickAction?: ChecklistItemClickAction;
  defaultNoteFilter?: DefaultNoteFilter;
  quickCreateNotes?: QuickCreateNotes;
  quickCreateNotesCategory?: string;
  hideConnectionIndicator?: HideConnectionIndicator;
  hideStatusOnCards?: HideStatusOnCards;
  hideMobileStatusDropdown?: HideMobileStatusDropdown;
  hideTimeTrackingOnCards?: HideTimeTrackingOnCards;
  codeBlockStyle?: CodeBlockStyle;
  newItemInsertion?: NewItemInsertion;
  searchMode?: SearchModes;
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
  loginType?: "local" | "sso" | "pending-mfa" | "ldap";
}

export type UserSettingsPatch = { [K in keyof User]?: User[K] | null };

export type SanitisedUser = Omit<
  User,
  "passwordHash" | "apiKey" | "lastLogin" | "mfaSecret" | "mfaRecoveryCode"
>;

export type PublicUserInfo = Pick<
  User,
  "username" | "isAdmin" | "isSuperAdmin" | "avatarUrl"
>;
