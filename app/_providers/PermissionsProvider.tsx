"use client";

import { createContext, useContext } from "react";
import { Checklist, Note } from "@/app/_types";
import { getPermissions } from "@/app/_utils/sharing-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { encodeCategoryPath } from "@/app/_utils/global-utils";

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
  const permissions = getPermissions(
    globalSharing,
    user?.username || "",
    item.id,
    encodeCategoryPath(item.category || "Uncategorized")
  );

  const canEdit =
    user?.isAdmin ||
    (user?.username && user.username === item.owner) ||
    permissions?.canEdit;
  const canDelete =
    user?.isAdmin ||
    (user?.username && user.username === item.owner) ||
    permissions?.canDelete;
  const canRead =
    user?.isAdmin ||
    (user?.username && user.username === item.owner) ||
    permissions?.canRead;

  const isOwner = (user?.username && user.username === item.owner) || false;

  const permissionsResult = { canEdit, canDelete, canRead, isOwner };

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
