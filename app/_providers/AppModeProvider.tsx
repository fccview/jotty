"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { AppMode, User } from "@/app/_types";
import { Modes } from "@/app/_types/enums";

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
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export const AppModeProvider = ({
  children,
  isDemoMode = false,
  isRwMarkable = false,
  user: initialUser,
}: {
  children: ReactNode;
  isDemoMode?: boolean;
  isRwMarkable?: boolean;
  user?: User | null;
}) => {
  const [mode, setMode] = useState<AppMode>(Modes.CHECKLISTS);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState<User | null>(initialUser || null);

  useEffect(() => {
    const savedMode =
      user?.landingPage === "last-visited"
        ? localStorage.getItem("app-mode")
        : user?.landingPage;

    if (savedMode === Modes.CHECKLISTS || savedMode === Modes.NOTES) {
      setMode(savedMode);
    }
    setIsInitialized(true);
  }, []);

  const handleSetMode = (newMode: AppMode) => {
    setMode(newMode);
    localStorage.setItem("app-mode", newMode);
  };

  return (
    <AppModeContext.Provider
      value={{
        mode,
        setMode: handleSetMode,
        selectedNote,
        setSelectedNote,
        isInitialized,
        isDemoMode,
        isRwMarkable,
        user,
        setUser,
      }}
    >
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
