"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { SharingPermissions } from "@/app/_types";
import { InheritedShare } from "@/app/_types/sharing";
import { Modes } from "@/app/_types/enums";
import {
  shareFolder,
  unshareFolder,
  setFolderPublic,
} from "@/app/_server/actions/share/operations";
import { folderShares } from "@/app/_server/actions/share/lookups";
import { useAppMode } from "@/app/_providers/AppModeProvider";

const READ_ONLY: SharingPermissions = {
  canRead: true,
  canEdit: false,
  canDelete: false,
  canCreate: false,
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
  const t = useTranslations();
  const { user, usersPublicData } = useAppMode();
  const owner = user?.username || "";

  const [categoryUuid, setCategoryUuid] = useState("");
  const [grants, setGrants] = useState<Record<string, SharingPermissions>>({});
  const [inheritedShares, setInheritedShares] = useState<InheritedShare[]>([]);
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
      setInheritedShares(shares.inherited);
      setIsPublic(shares.isPublic);
      setCategoryUuid(shares.uuid || "");
    } catch (error) {
      console.error("Failed to load folder sharing:", error);
      setGrants({});
      setInheritedShares([]);
      setIsPublic(false);
      setCategoryUuid("");
      setStatus({ isLoading: false, error: t("sharing.loadFailed") });
    } finally {
      setStatus((prev) => ({ ...prev, isLoading: false }));
    }
  }, [isOpen, mode, categoryPath, t]);

  useEffect(() => {
    reload();
  }, [reload]);

  const runAction = async (action: () => Promise<{ error?: string }>) => {
    if (!categoryUuid) {
      setStatus({ isLoading: false, error: t("sharing.folderNotReady") });
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
      setStatus({ isLoading: false, error: t("errors.anUnknownErrorOccurred") });
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
    const current = grants[username] || READ_ONLY;
    const next: SharingPermissions = {
      ...current,
      canCreate: current.canCreate ?? false,
      [permission]: value,
      canRead: true,
    };

    return runAction(() =>
      shareFolder(mode, owner, categoryUuid, username, next),
    );
  };

  const togglePublic = () =>
    runAction(() => setFolderPublic(mode, owner, categoryUuid, !isPublic));

  const people = useMemo(
    () =>
      (usersPublicData || []).flatMap(({ username, avatarUrl }) =>
        username && username !== owner ? [{ username, avatarUrl }] : [],
      ),
    [usersPublicData, owner],
  );

  const sharees = useMemo(
    () => people.filter(({ username }) => grants[username]),
    [people, grants],
  );

  const inherited = useMemo(() => {
    const avatars = new Map(
      people.map(({ username, avatarUrl }) => [username, avatarUrl]),
    );

    return inheritedShares
      .map(({ category, users, isPublic }) => ({
        category,
        isPublic,
        people: Object.entries(users)
          .filter(([username]) => username !== owner)
          .map(([username, permissions]) => ({
            username,
            avatarUrl: avatars.get(username),
            permissions,
          })),
      }))
      .filter((share) => share.people.length > 0 || share.isPublic);
  }, [inheritedShares, people, owner]);

  const candidates = useMemo(
    () =>
      people.filter(
        ({ username }) =>
          !grants[username] &&
          username.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [people, grants, searchQuery],
  );

  return {
    ...status,
    grants,
    sharees,
    inherited,
    isPublic,
    searchQuery,
    setSearchQuery,
    candidates,
    toggleUser,
    setPerms,
    togglePublic,
  };
};
