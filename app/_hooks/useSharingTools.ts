"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ItemType, PublicUserInfo, SharingPermissions } from "@/app/_types";
import { getUsers } from "@/app/_server/actions/users";
import { publicHref } from "@/app/_utils/global-utils";
import {
  shareItem,
  unshareItem,
  setItemPublic,
  detachItem,
  inheritItem,
} from "../_server/actions/share/operations";
import { itemShares } from "../_server/actions/share/lookups";
import { modeFor, nextItemPerms } from "@/app/_utils/sharing-utils";
import { DETACH_LOSSY } from "@/app/_consts/sharing";
import { getUsername } from "../_server/actions/users";

interface ShareModalProps {
  isOpen?: boolean;
  itemType: ItemType;
  itemTitle: string;
  itemOwner: string;
  itemUuid: string;
  onClose: () => void;
  enabled: boolean;
}

const READ_ONLY: SharingPermissions = {
  canRead: true,
  canEdit: false,
  canDelete: false,
};

export const useSharingTools = ({
  isOpen,
  itemType,
  itemOwner,
  itemUuid,
}: ShareModalProps) => {
  const t = useTranslations();
  const [users, setUsers] = useState<PublicUserInfo[]>([]);
  const [currentSharing, setCurrentSharing] = useState<string[]>([]);
  const [userPermissions, setUserPermissions] = useState<
    Record<string, SharingPermissions>
  >({});
  const [isPubliclyShared, setIsPubliclyShared] = useState(false);
  const [sharedParent, setSharedParent] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [publicUrl, setPublicUrl] = useState("");
  const [status, setStatus] = useState<{
    isLoading: boolean;
    error: string | null;
    success: string | null;
  }>({ isLoading: false, error: null, success: null });
  const [searchQuery, setSearchQuery] = useState("");

  const refusalText = (error?: string): string =>
    error === DETACH_LOSSY
      ? t("sharing.cantDetach")
      : error || t("errors.anUnknownErrorOccurred");

  const resetMessages = () =>
    setStatus((prev) => ({ ...prev, error: null, success: null }));

  const _executeShare = useCallback(
    async (targetUsers?: string) => {
      setStatus({ isLoading: true, error: null, success: null });
      try {
        const targetUsersList = targetUsers?.split(",") || [targetUsers || ""];

        for (const targetUser of targetUsersList) {
          const permissions = userPermissions[targetUser] || READ_ONLY;
          const result = await shareItem(
            modeFor(itemType),
            itemUuid,
            targetUser || "",
            { ...permissions, canRead: true }
          );
          if (!result.success) {
            throw new Error(refusalText(result.error));
          }
        }

        return { success: true, data: null };
      } catch (error) {
        setStatus({
          isLoading: false,
          success: null,
          error: error instanceof Error ? error.message : "An error occurred.",
        });
      } finally {
        setStatus((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [itemUuid, itemType, userPermissions]
  );

  const _executeUnshare = useCallback(
    async (targetUsers?: string) => {
      setStatus({ isLoading: true, error: null, success: null });

      try {
        const targetUsersList = targetUsers?.split(",") || [targetUsers || ""];

        for (const targetUser of targetUsersList) {
          const result = await unshareItem(modeFor(itemType), itemUuid, targetUser || "");
          if (!result.success) {
            throw new Error(refusalText(result.error));
          }
        }

        return { success: true, data: null };
      } catch (error) {
        setStatus({
          isLoading: false,
          success: null,
          error: error instanceof Error ? error.message : "An error occurred.",
        });
        return {
          success: false,
          error: error instanceof Error ? error.message : "An error occurred.",
        };
      } finally {
        setStatus((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [itemUuid, itemType]
  );

  const loadInitialState = useCallback(async () => {
    if (!isOpen) return;
    setStatus({ isLoading: true, error: null, success: null });
    try {
      const [usersData, shares] = await Promise.all([
        getUsers(),
        itemShares(itemUuid, itemType),
      ]);
      setUsers(usersData);

      const sharedUsers = Object.keys(shares.users);

      setCurrentSharing(sharedUsers);
      setUserPermissions(shares.users);
      setSharedParent(shares.sharedParent || null);
      setIsFollowing(shares.inherited && Boolean(shares.sharedParent));

      const isPublic = shares.isPublic;
      setIsPubliclyShared(isPublic);

      if (isPublic) {
        setPublicUrl(
          `${window.location.origin}${publicHref(itemType, itemUuid)}`
        );
      }
    } catch (error) {
      console.error("Couldn't load item shares:", error);
      setStatus({
        isLoading: false,
        success: null,
        error: t("sharing.loadFailed"),
      });
    } finally {
      setStatus((prev) => ({ ...prev, isLoading: false }));
    }
  }, [isOpen, itemUuid, itemType, t]);

  useEffect(() => {
    loadInitialState();
  }, [isOpen]);

  const handleShare = async (action: "share" | "unshare", user: string) => {
    const result =
      action === "share"
        ? await _executeShare(user)
        : await _executeUnshare(user);

    if (result?.success) {
      await loadInitialState();

      setStatus((prev) => ({
        ...prev,
        success: t(action === "share" ? "sharing.sharedOk" : "sharing.unsharedOk"),
      }));
    }
  };

  const handlePermissionChange = async (
    user: string,
    permission: keyof SharingPermissions,
    value: boolean
  ) => {
    const next = nextItemPerms(userPermissions[user] || READ_ONLY, permission, value);

    if (!currentSharing.includes(user)) {
      setUserPermissions((prev) => ({ ...prev, [user]: next }));
      return;
    }

    const result = await shareItem(modeFor(itemType), itemUuid, user, next);

    if (result.success) {
      setUserPermissions((prev) => ({ ...prev, [user]: next }));
    } else {
      setStatus((prev) => ({ ...prev, error: refusalText(result.error) }));
    }
  };

  const handlePublicToggle = async () => {
    const username = await getUsername();
    if (!username) return;

    setStatus({ isLoading: true, error: null, success: null });

    try {
      const toggled = await setItemPublic(
        modeFor(itemType),
        itemUuid,
        !isPubliclyShared
      );
      if (!toggled.success) throw new Error(refusalText(toggled.error));

      const shares = await itemShares(itemUuid, itemType);
      const isPublic = shares.isPublic;

      setIsPubliclyShared(isPublic);

      setStatus((prev) => ({
        ...prev,
        success: t(isPublic ? "sharing.nowPublic" : "sharing.nowPrivate"),
      }));

      if (isPublic) {
        setPublicUrl(
          `${window.location.origin}${publicHref(itemType, itemUuid)}`
        );
      } else {
        setPublicUrl("");
      }
    } catch (error) {
      setStatus({
        isLoading: false,
        success: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to toggle public sharing",
      });
    } finally {
      setStatus((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleFollow = async () => {
    setStatus({ isLoading: true, error: null, success: null });

    try {
      const mode = modeFor(itemType);
      const result = isFollowing
        ? await detachItem(mode, itemUuid)
        : await inheritItem(mode, itemUuid);

      if (!result.success) {
        throw new Error(refusalText(result.error));
      }

      await loadInitialState();
    } catch (error) {
      setStatus({
        isLoading: false,
        success: null,
        error: error instanceof Error ? error.message : "An error occurred.",
      });
    } finally {
      setStatus((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleRemoveAllSharing = async () => {
    const username = await getUsername();
    if (!username) return;

    setStatus({ isLoading: true, error: null, success: null });

    try {
      const mode = modeFor(itemType);

      for (const username of currentSharing) {
        const result = await unshareItem(mode, itemUuid, username);
        if (!result.success) throw new Error(refusalText(result.error));
      }

      if (isPubliclyShared) {
        const result = await setItemPublic(mode, itemUuid, false);
        if (!result.success) throw new Error(refusalText(result.error));
      }

      const shares = await itemShares(itemUuid, itemType);
      const sharedUsers = Object.keys(shares.users);
      const isPublic = shares.isPublic;

      setCurrentSharing(sharedUsers);
      setIsPubliclyShared(isPublic);
      if (!isPublic) {
        setPublicUrl("");
      }

      setStatus((prev) => ({
        ...prev,
        success: t("sharing.allRemoved"),
      }));
    } catch (error) {
      setStatus({
        isLoading: false,
        success: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove all sharing",
      });
    } finally {
      setStatus((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.username !== itemOwner &&
          user.username.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [users, itemOwner, searchQuery]
  );

  return {
    ...status,
    users,
    currentSharing,
    userPermissions,
    searchQuery,
    setSearchQuery,
    handleShare,
    handlePermissionChange,
    handlePublicToggle,
    isPubliclyShared,
    sharedParent,
    isFollowing,
    handleFollow,
    publicUrl,
    handleRemoveAllSharing,
    filteredUsers,
    resetMessages,
  };
};
