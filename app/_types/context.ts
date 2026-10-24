import { Note } from "./note";
import { Checklist } from "./checklist";
import { User, SanitisedUser } from "./user";
import { AppSettings } from "./config";
import { AllSharedItems, UserSharedItems } from "./sharing";
import { TagsIndex } from "./tags";
import { SidebarSnapshots } from "./sidebar";
import { LibraryStats } from "./catalog";

export type AppMode = "checklists" | "notes" | "tags";

export interface ContentFilter {
  type: 'category' | 'tag';
  value: string;
}

export interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  selectedNote: string | null;
  setSelectedNote: (id: string | null) => void;
  selectedFilter: ContentFilter | null;
  setSelectedFilter: (filter: ContentFilter | null) => void;
  isInitialized: boolean;
  isDemoMode: boolean;
  isRwMarkable: boolean;
  user: SanitisedUser | null;
  setUser: (user: SanitisedUser | null) => void;
  appVersion: string;
  appSettings: AppSettings | null;
  usersPublicData: Partial<User>[];
  library: LibraryStats;
  sidebar: SidebarSnapshots;
  allSharedItems: AllSharedItems | null;
  userSharedItems: UserSharedItems | null;
  globalSharing: any;
  availableLocales: { code: string; countryCode: string; name: string }[];
  tagsIndex: TagsIndex;
  tagsEnabled: boolean;
}
