"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useMemo,
} from "react";
import {
  AppMode,
  AppSettings,
  Checklist,
  Note,
  User,
  AppModeContextType,
  AllSharedItems,
  UserSharedItems,
  SanitisedUser,
} from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { LinkIndex } from "../_server/actions/link";
import { buildTagsIndex } from "../_utils/tag-utils";

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
  linkIndex,
  notes,
  checklists,
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
  linkIndex?: LinkIndex | null;
  notes?: Partial<Note>[];
  checklists?: Partial<Checklist>[];
  allSharedItems?: AllSharedItems | null;
  userSharedItems?: UserSharedItems | null;
  globalSharing?: any;
  availableLocales?: { code: string; countryCode: string; name: string }[];
}) => {
  const [appSettings, _] = useState<AppSettings | null>(
    initialSettings || null
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

  const [mode, setMode] = useState<AppMode>(modeToSet);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<{ type: 'category' | 'tag'; value: string } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState<SanitisedUser | null>(initialUser || null);

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (initialUser && (!user || user.username !== initialUser.username)) {
      setUser(initialUser);
    }
  }, [initialUser]);

  const handleSetMode = (newMode: AppMode) => {
    setMode(newMode);
    setSelectedFilter(null);
    localStorage.setItem("app-mode", newMode);
  };

  const tagsEnabled = appSettings?.editor?.enableTags !== false;

  const tagsIndex = useMemo(() => {
    if (!tagsEnabled || !notes) return {};
    return buildTagsIndex(notes);
  }, [notes, tagsEnabled]);

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
      linkIndex: linkIndex || null,
      notes: notes || [],
      checklists: checklists || [],
      allSharedItems: allSharedItems || null,
      userSharedItems: userSharedItems || null,
      globalSharing: globalSharing || null,
      availableLocales: availableLocales || [],
      tagsIndex,
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
      linkIndex,
      notes,
      checklists,
      allSharedItems,
      userSharedItems,
      globalSharing,
      availableLocales,
      tagsIndex,
      tagsEnabled,
    ]
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
