"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useMemo,
} from "react";
import { AppMode, AppSettings, Checklist, Note, User } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { LinkIndex } from "../_server/actions/link";

interface AppModeContextType {
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
  allSharedItems: {
    notes: Array<{ id: string; category: string }>;
    checklists: Array<{ id: string; category: string }>;
    public: {
      notes: Array<{ id: string; category: string }>;
      checklists: Array<{ id: string; category: string }>;
    };
  } | null;
  userSharedItems: {
    notes: Array<{ id: string; category: string; sharer: string }>;
    checklists: Array<{ id: string; category: string; sharer: string }>;
  } | null;
  globalSharing: any;
}

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
}: {
  children: ReactNode;
  isDemoMode?: boolean;
  isRwMarkable?: boolean;
  usersPublicData?: Partial<User>[];
  user?: User | null;
  pathname?: string;
  appVersion?: string;
  initialSettings?: AppSettings;
  linkIndex?: LinkIndex | null;
  notes?: Partial<Note>[];
  checklists?: Partial<Checklist>[];
  allSharedItems?: {
    notes: Array<{ id: string; category: string }>;
    checklists: Array<{ id: string; category: string }>;
    public: {
      notes: Array<{ id: string; category: string }>;
      checklists: Array<{ id: string; category: string }>;
    };
  } | null;
  userSharedItems?: {
    notes: Array<{ id: string; category: string; sharer: string }>;
    checklists: Array<{ id: string; category: string; sharer: string }>;
  } | null;
  globalSharing?: any;
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState<User | null>(initialUser || null);

  useEffect(() => {
    setIsInitialized(true);
  }, []);

  const handleSetMode = (newMode: AppMode) => {
    setMode(newMode);
    localStorage.setItem("app-mode", newMode);
  };

  const contextValue = useMemo(
    () => ({
      mode,
      setMode: handleSetMode,
      selectedNote,
      setSelectedNote,
      isInitialized,
      isDemoMode,
      isRwMarkable,
      user,
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
    }),
    [
      mode,
      handleSetMode,
      selectedNote,
      isInitialized,
      isDemoMode,
      isRwMarkable,
      user,
      appSettings,
      appVersion,
      usersPublicData,
      linkIndex,
      notes,
      checklists,
      allSharedItems,
      userSharedItems,
      globalSharing,
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
