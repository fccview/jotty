"use client";

import { createContext, useContext, useMemo } from "react";
import { Checklist, Note } from "@/app/_types";
import { getPermissions } from "@/app/_utils/sharing-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { encodeCategoryPath } from "@/app/_utils/global-utils";

const permissionsCache = new Map<
  string,
  { permissions: any; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000;

interface PermissionsContextType {
  permissions: {
    canRead: boolean;
    canEdit: boolean;
    canDelete: boolean;
    isOwner: boolean;
  } | null;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(
  undefined
);

export const PermissionsProvider = ({
  children,
  item,
}: {
  children: React.ReactNode;
  item: Checklist | Note;
}) => {
  const { globalSharing, user } = useAppMode();

  const permissionsResult = useMemo(() => {
    const isOwner = (user?.username && user.username === item.owner) || false;
    const isAdmin = user?.isAdmin || false;

    if (isOwner || isAdmin) {
      return {
        canEdit: true,
        canDelete: true,
        canRead: true,
        isOwner,
      };
    }

    const cacheKey = `${user?.username || ""}-${item.id}-${encodeCategoryPath(
      item.category || "Uncategorized"
    )}-${JSON.stringify(globalSharing || {})}`;
    const now = Date.now();

    const cached = permissionsCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return cached.permissions;
    }

    const permissions = getPermissions(
      globalSharing,
      user?.username || "",
      item.id,
      encodeCategoryPath(item.category || "Uncategorized")
    );

    const result = {
      canEdit: permissions?.canEdit || false,
      canDelete: permissions?.canDelete || false,
      canRead: permissions?.canRead || false,
      isOwner: false,
    };

    permissionsCache.set(cacheKey, { permissions: result, timestamp: now });

    return result;
  }, [
    globalSharing,
    user?.username,
    user?.isAdmin,
    item.id,
    item.category,
    item.owner,
  ]);

  return (
    <PermissionsContext.Provider value={{ permissions: permissionsResult }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
};
