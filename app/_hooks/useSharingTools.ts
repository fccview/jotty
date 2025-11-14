"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { ItemType, User } from "@/app/_types";
import { readJsonFile } from "@/app/_server/actions/file";
import { USERS_FILE } from "@/app/_consts/files";
import {
  buildCategoryPath,
  encodeCategoryPath,
} from "@/app/_utils/global-utils";
import {
  shareWith,
  unshareWith,
  readShareFile,
  getItemPermissions,
  updateItemPermissions,
  SharingPermissions,
} from "../_server/actions/sharing";
import { getCurrentUser } from "../_server/actions/users";
import { ItemTypes } from "../_types/enums";

interface ShareModalProps {
  isOpen?: boolean;
  itemId: string;
  itemType: ItemType;
  itemTitle: string;
  itemCategory?: string;
  itemOwner: string;
  itemUuid?: string;
  onClose: () => void;
  enabled: boolean;
}

export const useSharingTools = ({
  isOpen,
  itemId,
  itemType,
  itemTitle,
  itemCategory,
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
        const currentUser = await getCurrentUser();
        const formData = new FormData();

        formData.append("itemId", itemId);
        formData.append("type", itemType);
        formData.append("title", itemTitle);
        formData.append("category", itemCategory || "Uncategorized");

        if (targetUsers) formData.append("targetUsers", targetUsers);

        const targetUsersList = targetUsers?.split(",") || [targetUsers || ""];

        for (const targetUser of targetUsersList) {
          const permissions = userPermissions[targetUser] || {
            canRead: true,
            canEdit: false,
            canDelete: false,
          };
          const finalPermissions = { ...permissions, canRead: true };
          const result = await shareWith(
            itemId,
            itemCategory || "Uncategorized",
            currentUser?.username || "",
            targetUser || "",
            itemType,
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
    [itemUuid, itemId, itemType, itemTitle, itemCategory, userPermissions]
  );

  const _executeUnshare = useCallback(
    async (targetUsers?: string) => {
      setStatus({ isLoading: true, error: null, success: null });

      try {
        const targetUsersList = targetUsers?.split(",") || [targetUsers || ""];
        const currentUser = await getCurrentUser();

        for (const targetUser of targetUsersList) {
          await unshareWith(
            itemId,
            itemCategory || "Uncategorized",
            currentUser?.username || "",
            targetUser || "",
            itemType
          );
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
    [itemUuid, itemId, itemType, itemCategory, itemOwner]
  );

  const loadInitialState = useCallback(async () => {
    if (!isOpen) return;
    setStatus({ isLoading: true, error: null, success: null });
    try {
      const [usersData, sharingData] = await Promise.all([
        readJsonFile(USERS_FILE),
        readShareFile(itemType),
      ]);
      setUsers(usersData);

      const encodedCategory = encodeCategoryPath(
        itemCategory || "Uncategorized"
      );
      const sharedUsers: string[] = [];

      const permissionsMap: Record<string, SharingPermissions> = {};

      Object.entries(sharingData).forEach(([username, items]) => {
        if (username !== "public") {
          const itemEntry = items.find(
            (entry) =>
              entry.uuid === itemUuid ||
              (entry.id === itemId && entry.category === encodedCategory)
          );

          if (itemEntry) {
            sharedUsers.push(username);
            permissionsMap[username] = itemEntry.permissions;
          }
        }
      });

      setCurrentSharing(sharedUsers);
      setSelectedUsers(sharedUsers);
      setUserPermissions(permissionsMap);

      const publicItems = sharingData.public || [];
      const isPublic = publicItems.some(
        (entry) =>
          entry.uuid === itemUuid ||
          (entry.id === itemId && entry.category === encodedCategory)
      );
      setIsPubliclyShared(isPublic);

      if (isPublic) {
        const publicPath =
          itemType === ItemTypes.CHECKLIST ? "public/checklist" : "public/note";
        const categoryPath = buildCategoryPath(
          itemCategory || "Uncategorized",
          itemId
        );
        setPublicUrl(`${window.location.origin}/${publicPath}/${categoryPath}`);
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
        success: `Item ${
          action === "share" ? "shared" : "unshared"
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
        const result = await updateItemPermissions(
          itemId,
          itemCategory || "Uncategorized",
          itemType,
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
        const result = await updateItemPermissions(
          itemId,
          itemCategory || "Uncategorized",
          itemType,
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
    const currentUser = await getCurrentUser();
    if (!currentUser) return;

    setStatus({ isLoading: true, error: null, success: null });

    try {
      if (isPubliclyShared) {
        await unshareWith(
          itemId,
          itemCategory || "Uncategorized",
          currentUser.username,
          "public",
          itemType
        );
      } else {
        await shareWith(
          itemId,
          itemCategory || "Uncategorized",
          currentUser.username,
          "public",
          itemType
        );
      }

      const sharingData = await readShareFile(itemType);
      const publicItems = sharingData.public || [];
      const encodedCategory = encodeCategoryPath(
        itemCategory || "Uncategorized"
      );
      const isPublic = publicItems.some(
        (entry) =>
          entry.uuid === itemUuid ||
          (entry.id === itemId && entry.category === encodedCategory)
      );

      setIsPubliclyShared(isPublic);

      setStatus((prev) => ({
        ...prev,
        success: `Item is now ${
          isPublic ? "publicly" : "no longer"
        } accessible!`,
      }));

      if (isPublic) {
        const publicPath =
          itemType === ItemTypes.CHECKLIST ? "public/checklist" : "public/note";
        const categoryPath = buildCategoryPath(
          itemCategory || "Uncategorized",
          itemId
        );
        setPublicUrl(`${window.location.origin}/${publicPath}/${categoryPath}`);
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

  const handleRemoveAllSharing = async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) return;

    setStatus({ isLoading: true, error: null, success: null });

    try {
      for (const username of currentSharing) {
        await unshareWith(
          itemId,
          itemCategory || "Uncategorized",
          currentUser.username,
          username,
          itemType
        );
      }

      if (isPubliclyShared) {
        await unshareWith(
          itemId,
          itemCategory || "Uncategorized",
          currentUser.username,
          "public",
          itemType
        );
      }

      const sharingData = await readShareFile(itemType);
      const sharedUsers: string[] = [];
      const encodedCategory = encodeCategoryPath(
        itemCategory || "Uncategorized"
      );

      Object.entries(sharingData).forEach(([username, items]) => {
        if (username !== "public") {
          const hasItem = items.some(
            (entry) =>
              entry.uuid === itemUuid ||
              (entry.id === itemId && entry.category === encodedCategory)
          );
          if (hasItem) {
            sharedUsers.push(username);
          }
        }
      });

      const publicItems = sharingData.public || [];
      const isPublic = publicItems.some(
        (entry) =>
          entry.uuid === itemUuid ||
          (entry.id === itemId && entry.category === encodedCategory)
      );

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
    publicUrl,
    handleRemoveAllSharing,
    filteredUsers,
    resetMessages,
  };
};
