"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";

interface NavigationGuardContextType {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  registerNavigationGuard: (guard: () => boolean) => void;
  unregisterNavigationGuard: () => void;
  checkNavigation: (action: () => void) => void;
  checkWouldBlock: () => boolean;
  setPendingNavigation: (action: () => void) => void;
  clearPendingNavigation: () => void;
  executePendingNavigation: () => void;
}

const NavigationGuardContext = createContext<
  NavigationGuardContextType | undefined
>(undefined);

export const NavigationGuardProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [navigationGuard, setNavigationGuard] = useState<
    (() => boolean) | null
  >(null);
  const pendingRef = useRef<(() => void) | null>(null);

  const setPendingNavigation = useCallback((action: () => void) => {
    pendingRef.current = action;
  }, []);

  const registerNavigationGuard = useCallback((guard: () => boolean) => {
    setNavigationGuard(() => guard);
  }, []);

  const unregisterNavigationGuard = useCallback(() => {
    setNavigationGuard(null);
  }, []);

  const checkNavigation = useCallback(
    (action: () => void) => {
      if (navigationGuard && !navigationGuard()) {
        pendingRef.current = action;
        return;
      }
      action();
    },
    [navigationGuard]
  );

  const checkWouldBlock = useCallback(() => {
    return navigationGuard ? !navigationGuard() : false;
  }, [navigationGuard]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges]);

  const clearPendingNavigation = useCallback(() => {
    pendingRef.current = null;
  }, []);

  const executePendingNavigation = useCallback(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    pending?.();
  }, []);

  return (
    <NavigationGuardContext.Provider
      value={{
        hasUnsavedChanges,
        setHasUnsavedChanges,
        registerNavigationGuard,
        unregisterNavigationGuard,
        checkNavigation,
        checkWouldBlock,
        setPendingNavigation,
        clearPendingNavigation,
        executePendingNavigation,
      }}
    >
      {children}
    </NavigationGuardContext.Provider>
  );
};

export const useNavigationGuard = () => {
  const context = useContext(NavigationGuardContext);
  if (context === undefined) {
    throw new Error(
      "useNavigationGuard must be used within a NavigationGuardProvider"
    );
  }
  return context;
};
