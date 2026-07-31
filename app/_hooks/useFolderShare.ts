"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { SharingPermissions } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import {
  shareFolder,
  unshareFolder,
  setFolderPublic,
} from "@/app/_server/actions/share/operations";
import { folderShares } from "@/app/_server/actions/share/queries";
import { useAppMode } from "@/app/_providers/AppModeProvider";

const READ_ONLY: SharingPermissions = {
  canRead: true,
  canEdit: false,
  canDelete: false,
};

interface FolderShareArgs {
  isOpen: boolean;
  mode: Modes;
  categoryPath: string;
}

export const useFolderShare = ({
  isOpen,
  mode,
  categoryPath,
}: FolderShareArgs) => {
  const { user, usersPublicData } = useAppMode();
  const owner = user?.username || "";

  const [categoryUuid, setCategoryUuid] = useState("");
  const [grants, setGrants] = useState<Record<string, SharingPermissions>>({});
  const [isPublic, setIsPublic] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState<{
    isLoading: boolean;
    error: string | null;
  }>({ isLoading: false, error: null });

  const reload = useCallback(async () => {
    if (!isOpen || !categoryPath) return;

    setStatus({ isLoading: true, error: null });

    try {
      const shares = await folderShares(mode, categoryPath);

      setGrants(shares.users);
      setIsPublic(shares.isPublic);
      setCategoryUuid(shares.uuid || "");
    } catch (error) {
      console.error("Failed to load folder sharing:", error);
      setStatus({ isLoading: false, error: "Failed to load folder sharing" });
    } finally {
      setStatus((prev) => ({ ...prev, isLoading: false }));
    }
  }, [isOpen, mode, categoryPath]);

  useEffect(() => {
    reload();
  }, [reload]);

  const runAction = async (action: () => Promise<{ error?: string }>) => {
    if (!categoryUuid) {
      setStatus({ isLoading: false, error: "Folder is not ready yet" });
      return;
    }

    setStatus({ isLoading: true, error: null });

    try {
      const result = await action();

      if (result.error) {
        setStatus({ isLoading: false, error: result.error });
        return;
      }

      await reload();
    } catch (error) {
      console.error("Folder sharing action failed:", error);
      setStatus({ isLoading: false, error: "Something went wrong" });
    } finally {
      setStatus((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const toggleUser = (username: string) =>
    runAction(() =>
      grants[username]
        ? unshareFolder(mode, owner, categoryUuid, username)
        : shareFolder(mode, owner, categoryUuid, username, READ_ONLY),
    );

  const setPerms = (
    username: string,
    permission: keyof SharingPermissions,
    value: boolean,
  ) => {
    const next = {
      ...(grants[username] || READ_ONLY),
      [permission]: value,
      canRead: true,
    };

    return runAction(() =>
      shareFolder(mode, owner, categoryUuid, username, next),
    );
  };

  const togglePublic = () =>
    runAction(() => setFolderPublic(mode, owner, categoryUuid, !isPublic));

  const filteredUsers = useMemo(
    () =>
      (usersPublicData || []).filter(
        (entry) =>
          entry.username &&
          entry.username !== owner &&
          entry.username.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [usersPublicData, owner, searchQuery],
  );

  return {
    ...status,
    grants,
    isPublic,
    searchQuery,
    setSearchQuery,
    filteredUsers,
    toggleUser,
    setPerms,
    togglePublic,
  };
};
