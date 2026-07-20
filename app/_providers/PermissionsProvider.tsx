"use client";

import { createContext, useContext, useMemo } from "react";
import { Checklist, Note } from "@/app/_types";
import { getPermissions } from "@/app/_utils/sharing-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { Modes } from "../_types/enums";

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
  undefined,
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
    const isAdmin = user?.isAdmin || false;
    const isOwner =
      (!item.isShared && user?.username && user.username === item.owner) ||
      false;

    if (item.isShared) {
      const itemType = "items" in item ? Modes.CHECKLISTS : Modes.NOTES;
      const permissions = getPermissions(
        globalSharing,
        user?.username || "",
        item.uuid!,
        itemType,
      );
      return {
        canEdit: permissions?.canEdit === true,
        canDelete: permissions?.canDelete === true,
        canRead: permissions?.canRead === true,
        isOwner: false,
      };
    }

    if (isOwner || isAdmin) {
      return {
        canEdit: true,
        canDelete: true,
        canRead: true,
        isOwner,
      };
    }

    const cacheKey = `${user?.username || ""}-${item.uuid}-${JSON.stringify(
      globalSharing || {},
    )}`;
    const now = Date.now();

    const cached = permissionsCache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return cached.permissions;
    }

    const itemType = "items" in item ? Modes.CHECKLISTS : Modes.NOTES;
    const permissions = getPermissions(
      globalSharing,
      user?.username || "",
      item.uuid!,
      itemType,
    );

    const result = {
      canEdit: permissions?.canEdit === true,
      canDelete: permissions?.canDelete === true,
      canRead: permissions?.canRead === true,
      isOwner: false,
    };

    permissionsCache.set(cacheKey, { permissions: result, timestamp: now });

    return result;
  }, [
    globalSharing,
    user?.username,
    user?.isAdmin,
    item.id,
    item.uuid,
    item.category,
    item.owner,
    item.isShared,
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
