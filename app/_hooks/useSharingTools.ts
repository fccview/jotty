"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { ItemType, User } from "@/app/_types";
import { readJsonFile } from "@/app/_server/actions/file";
import { USERS_FILE } from "@/app/_consts/files";
import { publicHref } from "@/app/_utils/global-utils";
import {
  shareItem,
  unshareItem,
  setItemPublic,
  optOutItem,
  inheritItem,
} from "../_server/actions/share/operations";
import { itemShares } from "../_server/actions/share/queries";
import { modeFor } from "@/app/_utils/sharing-utils";
import { SharingPermissions } from "@/app/_types";
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

export const useSharingTools = ({
  isOpen,
  itemType,
  itemOwner,
  itemUuid,
}: ShareModalProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentSharing, setCurrentSharing] = useState<string[]>([]);
  const [userPermissions, setUserPermissions] = useState<
    Record<string, SharingPermissions>
  >({});
  const [isPubliclyShared, setIsPubliclyShared] = useState(false);
  const [inheritedFrom, setInheritedFrom] = useState<string | null>(null);
  const [isOptedOut, setIsOptedOut] = useState(false);
  const [publicUrl, setPublicUrl] = useState("");
  const [status, setStatus] = useState<{
    isLoading: boolean;
    error: string | null;
    success: string | null;
  }>({ isLoading: false, error: null, success: null });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "public">("users");

  const resetMessages = () =>
    setStatus((prev) => ({ ...prev, error: null, success: null }));

  const _executeShare = useCallback(
    async (targetUsers?: string) => {
      setStatus({ isLoading: true, error: null, success: null });
      try {
        const targetUsersList = targetUsers?.split(",") || [targetUsers || ""];

        for (const targetUser of targetUsersList) {
          const permissions = userPermissions[targetUser] || {
            canRead: true,
            canEdit: false,
            canDelete: false,
          };
          const finalPermissions = { ...permissions, canRead: true };
          const result = await shareItem(
            modeFor(itemType),
            itemUuid,
            targetUser || "",
            finalPermissions
          );
          if (!result.success) {
            throw new Error(result.error || "An unknown error occurred.");
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
          await unshareItem(modeFor(itemType), itemUuid, targetUser || "");
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
    [itemUuid, itemType, itemOwner]
  );

  const loadInitialState = useCallback(async () => {
    if (!isOpen) return;
    setStatus({ isLoading: true, error: null, success: null });
    try {
      const [usersData, shares] = await Promise.all([
        readJsonFile(USERS_FILE),
        itemShares(itemUuid, itemType),
      ]);
      setUsers(usersData);

      const sharedUsers = Object.keys(shares.users);

      setCurrentSharing(sharedUsers);
      setSelectedUsers(sharedUsers);
      setUserPermissions(shares.users);
      setInheritedFrom(shares.inherited ? shares.viaCategory || null : null);
      setIsOptedOut(
        !shares.inherited &&
        sharedUsers.length === 0 &&
        !shares.isPublic
      );

      const isPublic = shares.isPublic;
      setIsPubliclyShared(isPublic);

      if (isPublic) {
        setPublicUrl(
          `${window.location.origin}${publicHref(itemType, itemUuid)}`
        );
      }
    } catch (error) {
      setStatus({
        isLoading: false,
        success: null,
        error: "Failed to load sharing details.",
      });
    } finally {
      setStatus((prev) => ({ ...prev, isLoading: false }));
    }
  }, [isOpen, itemUuid, itemType, itemOwner]);

  useEffect(() => {
    loadInitialState();
  }, [isOpen]);

  const handleUserToggle = (username: string) => {
    resetMessages();
    setSelectedUsers((prev) => {
      const isCurrentlySelected = prev.includes(username);
      if (isCurrentlySelected) {
        setUserPermissions((current) => {
          const newPermissions = { ...current };
          delete newPermissions[username];
          return newPermissions;
        });
        return prev.filter((u) => u !== username);
      } else {
        setUserPermissions((current) => ({
          ...current,
          [username]: { canRead: true, canEdit: false, canDelete: false },
        }));
        return [...prev, username];
      }
    });
  };

  const handleShare = async (action: "share" | "unshare", user: string) => {
    const result =
      action === "share"
        ? await _executeShare(user)
        : await _executeUnshare(user);

    if (result?.success) {
      await loadInitialState();

      setStatus((prev) => ({
        ...prev,
        success: `Item ${action === "share" ? "shared" : "unshared"
          } successfully!`,
      }));
    }
  };

  const handlePermissionChange = async (
    user: string,
    permission: keyof SharingPermissions,
    value: boolean
  ) => {
    const currentPermissions = userPermissions[user] || {
      canRead: true,
      canEdit: false,
      canDelete: false,
    };
    const newPermissions = { ...currentPermissions, [permission]: value };

    const hasNoPermissions =
      !newPermissions.canRead &&
      !newPermissions.canEdit &&
      !newPermissions.canDelete;

    if (hasNoPermissions && currentSharing.includes(user)) {
      const result = await _executeUnshare(user);
      if (result?.success) {
        await loadInitialState();
        setStatus((prev) => ({
          ...prev,
          success: "Item unshared - no permissions remaining",
        }));
      }
    } else {
      if (currentSharing.includes(user)) {
        const result = await shareItem(
          modeFor(itemType),
          itemUuid,
          user,
          newPermissions
        );

        if (result.success) {
          setUserPermissions((prev) => ({ ...prev, [user]: newPermissions }));
        }
      } else {
        setUserPermissions((prev) => ({ ...prev, [user]: newPermissions }));
      }
    }
  };

  const handleAllPermissionsChange = async (user: string, value: boolean) => {
    const newPermissions: SharingPermissions = {
      canRead: value,
      canEdit: value,
      canDelete: value,
    };

    const hasNoPermissions = !value;

    if (hasNoPermissions && currentSharing.includes(user)) {
      const result = await _executeUnshare(user);
      if (result?.success) {
        await loadInitialState();
        setStatus((prev) => ({
          ...prev,
          success: "Item unshared - no permissions remaining",
        }));
      }
    } else {
      if (currentSharing.includes(user)) {
        const result = await shareItem(
          modeFor(itemType),
          itemUuid,
          user,
          newPermissions
        );

        if (result.success) {
          setUserPermissions((prev) => ({ ...prev, [user]: newPermissions }));
        }
      } else {
        setUserPermissions((prev) => ({ ...prev, [user]: newPermissions }));
      }
    }
  };

  const handlePublicToggle = async () => {
    const username = await getUsername();
    if (!username) return;

    setStatus({ isLoading: true, error: null, success: null });

    try {
      await setItemPublic(modeFor(itemType), itemUuid, !isPubliclyShared);

      const shares = await itemShares(itemUuid, itemType);
      const isPublic = shares.isPublic;

      setIsPubliclyShared(isPublic);

      setStatus((prev) => ({
        ...prev,
        success: `Item is now ${isPublic ? "publicly" : "no longer"
          } accessible!`,
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

  const handleOptOut = async () => {
    setStatus({ isLoading: true, error: null, success: null });

    try {
      const mode = modeFor(itemType);
      const result = isOptedOut
        ? await inheritItem(mode, itemUuid)
        : await optOutItem(mode, itemUuid);

      if (!result.success) {
        throw new Error(result.error || "Failed to update sharing");
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
        await unshareItem(mode, itemUuid, username);
      }

      if (isPubliclyShared) {
        await setItemPublic(mode, itemUuid, false);
      }

      const shares = await itemShares(itemUuid, itemType);
      const sharedUsers = Object.keys(shares.users);
      const isPublic = shares.isPublic;

      setCurrentSharing(sharedUsers);
      setSelectedUsers(sharedUsers);
      setIsPubliclyShared(isPublic);
      if (!isPublic) {
        setPublicUrl("");
      }

      setStatus((prev) => ({
        ...prev,
        success: "All sharing has been removed.",
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
    selectedUsers,
    currentSharing,
    userPermissions,
    searchQuery,
    setSearchQuery,
    handleUserToggle,
    handleShare,
    handlePermissionChange,
    handleAllPermissionsChange,
    activeTab,
    setActiveTab,
    handlePublicToggle,
    isPubliclyShared,
    inheritedFrom,
    isOptedOut,
    handleOptOut,
    publicUrl,
    handleRemoveAllSharing,
    filteredUsers,
    resetMessages,
  };
};
