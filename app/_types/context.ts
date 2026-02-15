import { Note } from "./note";
import { Checklist } from "./checklist";
import { User, SanitisedUser } from "./user";
import { AppSettings } from "./config";
import { LinkIndex } from "./links";
import { AllSharedItems, UserSharedItems } from "./sharing";
import { TagsIndex } from "./tags";

export type AppMode = "checklists" | "notes";

export interface ContentFilter {
  type: 'category' | 'tag';
  value: string;
}

export interface AppModeContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  selectedNote: string | null;
  setSelectedNote: (id: string | null) => void;
  selectedFilter: { type: 'category' | 'tag'; value: string } | null;
  setSelectedFilter: (filter: { type: 'category' | 'tag'; value: string } | null) => void;
  isInitialized: boolean;
  isDemoMode: boolean;
  isRwMarkable: boolean;
  user: SanitisedUser | null;
  setUser: (user: SanitisedUser | null) => void;
  appVersion: string;
  appSettings: AppSettings | null;
  usersPublicData: Partial<User>[];
  linkIndex: LinkIndex | null;
  notes: Partial<Note>[];
  checklists: Partial<Checklist>[];
  allSharedItems: AllSharedItems | null;
  userSharedItems: UserSharedItems | null;
  globalSharing: any;
  availableLocales: { code: string; countryCode: string; name: string }[];
  tagsIndex: TagsIndex;
  tagsEnabled: boolean;
}
