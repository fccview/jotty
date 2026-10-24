"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  AppMode,
  AppSettings,
  Checklist,
  Note,
  User,
  AppModeContextType,
  AllSharedItems,
  ContentFilter,
  UserSharedItems,
  SanitisedUser,
  SidebarSnapshots,
  LibraryStats,
  TagsIndex,
} from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { useSidebarStore } from "../_utils/sidebar-store";

const sameUser = (left: SanitisedUser | null, right: SanitisedUser) =>
  JSON.stringify(left) === JSON.stringify(right);

const NO_SIDEBAR: SidebarSnapshots = {};
const NO_TAGS: TagsIndex = {};
const NO_LIBRARY: LibraryStats = { notes: 0, encryptedNotes: 0, checklists: 0, boards: 0 };

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export const AppModeProvider = ({
  children,
  isDemoMode = false,
  isRwMarkable = false,
  usersPublicData = [],
  user: initialUser,
  pathname,
  appVersion,
  initialSettings,
  library,
  tagsIndex,
  sidebar,
  allSharedItems,
  userSharedItems,
  globalSharing,
  availableLocales = [],
}: {
  children: ReactNode;
  isDemoMode?: boolean;
  isRwMarkable?: boolean;
  usersPublicData?: Partial<User>[];
  user?: SanitisedUser | null;
  pathname?: string;
  appVersion?: string;
  initialSettings?: AppSettings;
  library?: LibraryStats;
  tagsIndex?: TagsIndex;
  sidebar?: SidebarSnapshots;
  allSharedItems?: AllSharedItems | null;
  userSharedItems?: UserSharedItems | null;
  globalSharing?: any;
  availableLocales?: { code: string; countryCode: string; name: string }[];
}) => {
  const [appSettings, _] = useState<AppSettings | null>(
    initialSettings || null,
  );
  const isNoteOrChecklistPage =
    pathname?.includes("/checklist") || pathname?.includes("/note");
  let modeToSet: AppMode = Modes.CHECKLISTS;

  if (isNoteOrChecklistPage) {
    modeToSet = pathname?.includes("/checklist")
      ? Modes.CHECKLISTS
      : Modes.NOTES;
  }
  if (!isNoteOrChecklistPage) {
    modeToSet =
      initialUser?.landingPage === Modes.CHECKLISTS
        ? Modes.CHECKLISTS
        : Modes.NOTES || Modes.CHECKLISTS;
  }

  const searchParams = useSearchParams();
  const tagParam = searchParams.get("tag");
  const modeParam = searchParams.get("mode");
  const categoryParam = searchParams.get("category");

  if (modeParam === Modes.TAGS || tagParam) {
    modeToSet = Modes.TAGS;
  } else if (modeParam === Modes.NOTES) {
    modeToSet = Modes.NOTES;
  } else if (modeParam === Modes.CHECKLISTS) {
    modeToSet = Modes.CHECKLISTS;
  }

  const [mode, setMode] = useState<AppMode>(modeToSet);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);

  const initialFilter = tagParam
    ? { type: "tag" as const, value: tagParam }
    : categoryParam
      ? { type: "category" as const, value: categoryParam }
      : null;

  const [selectedFilter, setSelectedFilter] = useState<ContentFilter | null>(initialFilter);
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState<SanitisedUser | null>(initialUser || null);

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialUser) return;
    setUser((prev) => (sameUser(prev, initialUser) ? prev : initialUser));
  }, [initialUser]);

  const setStoredMode = useSidebarStore((state) => state.setMode);

  useEffect(() => {
    if (modeParam === Modes.TAGS || tagParam) {
      setMode(Modes.TAGS);
      setStoredMode(Modes.TAGS);
      setSelectedFilter(
        tagParam ? { type: "tag", value: tagParam } : null
      );
    } else if (modeParam === Modes.NOTES) {
      setMode(Modes.NOTES);
      setStoredMode(Modes.NOTES);
      setSelectedFilter(
        categoryParam ? { type: "category", value: categoryParam } : null,
      );
    } else if (modeParam === Modes.CHECKLISTS) {
      setMode(Modes.CHECKLISTS);
      setStoredMode(Modes.CHECKLISTS);
      setSelectedFilter(
        categoryParam ? { type: "category", value: categoryParam } : null,
      );
    }
  }, [modeParam, tagParam, categoryParam, setStoredMode]);

  const handleSetMode = useCallback(
    (newMode: AppMode) => {
      setMode(newMode);
      if (newMode !== Modes.TAGS) {
        setSelectedFilter(null);
      }
      setStoredMode(newMode);
    },
    [setStoredMode],
  );

  const tagsEnabled = appSettings?.editor?.enableTags !== false;


  const contextValue = useMemo(
    () => ({
      mode,
      setMode: handleSetMode,
      selectedNote,
      setSelectedNote,
      selectedFilter,
      setSelectedFilter,
      isInitialized,
      isDemoMode,
      isRwMarkable,
      user: user || initialUser || null,
      setUser,
      appSettings,
      appVersion: appVersion || "",
      usersPublicData,
      library: library || NO_LIBRARY,
      sidebar: sidebar || NO_SIDEBAR,
      allSharedItems: allSharedItems || null,
      userSharedItems: userSharedItems || null,
      globalSharing: globalSharing || null,
      availableLocales: availableLocales || [],
      tagsIndex: tagsEnabled ? tagsIndex || NO_TAGS : NO_TAGS,
      tagsEnabled,
    }),
    [
      mode,
      handleSetMode,
      selectedNote,
      selectedFilter,
      isInitialized,
      isDemoMode,
      isRwMarkable,
      user,
      initialUser,
      appSettings,
      appVersion,
      usersPublicData,
      library,
      sidebar,
      allSharedItems,
      userSharedItems,
      globalSharing,
      availableLocales,
      tagsIndex,
      tagsEnabled,
    ],
  );

  return (
    <AppModeContext.Provider value={contextValue}>
      {children}
    </AppModeContext.Provider>
  );
};

export const useAppMode = () => {
  const context = useContext(AppModeContext);
  if (context === undefined) {
    throw new Error("useAppMode must be used within an AppModeProvider");
  }
  return context;
};
