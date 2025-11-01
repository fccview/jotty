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
} from "../_server/actions/sharing";
import { getCurrentUser } from "../_server/actions/users";


interface ShareModalProps {
  isOpen?: boolean;
  itemId: string;
  itemType: ItemType;
  itemTitle: string;
  itemCategory?: string;
  itemOwner: string;
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
}: ShareModalProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [currentSharing, setCurrentSharing] = useState<string[]>([]);
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
          const result = await shareWith(
            itemId,
            itemCategory || "Uncategorized",
            currentUser?.username || "",
            targetUser || "",
            itemType
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
    [itemId, itemType, itemTitle, itemCategory]
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
    [itemId, itemType, itemCategory, itemOwner]
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

      Object.entries(sharingData).forEach(([username, items]) => {
        if (username !== "public") {
          const hasItem = items.some(
            (entry) => entry.id === itemId && entry.category === encodedCategory
          );

          if (hasItem) {
            sharedUsers.push(username);
          }
        }
      });

      setCurrentSharing(sharedUsers);
      setSelectedUsers(sharedUsers);

      // Check if publicly shared
      const publicItems = sharingData.public || [];
      const isPublic = publicItems.some(
        (entry) => entry.id === itemId && entry.sharer === itemOwner
      );
      setIsPubliclyShared(isPublic);

      if (isPublic) {
        const publicPath =
          itemType === "checklist" ? "public/checklist" : "public/note";
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
  }, [isOpen, itemId, itemType, itemOwner, itemCategory]);

  useEffect(() => {
    loadInitialState();
  }, [isOpen]);

  const handleUserToggle = (username: string) => {
    resetMessages();
    setSelectedUsers((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username]
    );
  };

  const handleShare = async (action: "share" | "unshare", user: string) => {
    const result =
      action === "share"
        ? await _executeShare(user)
        : await _executeUnshare(user);

    if (result?.success) {
      try {
        const sharingData = await readShareFile(itemType);
        const encodedCategory = encodeCategoryPath(
          itemCategory || "Uncategorized"
        );
        const sharedUsers: string[] = [];

        Object.entries(sharingData).forEach(([username, items]) => {
          if (username !== "public") {
            const hasItem = items.some(
              (entry) =>
                entry.id === itemId && entry.category === encodedCategory
            );
            if (hasItem) {
              sharedUsers.push(username);
            }
          }
        });

        setCurrentSharing(sharedUsers);
        setSelectedUsers(sharedUsers);
      } catch (error) {
        console.error("Error refreshing sharing state:", error);
      }

      setStatus((prev) => ({
        ...prev,
        success: `Item ${action === "share" ? "shared" : "unshared"
          } successfully!`,
      }));
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
      const encodedCategory = encodeCategoryPath(
        itemCategory || "Uncategorized"
      );
      const publicItems = sharingData.public || [];
      const isPublic = publicItems.some(
        (entry) => entry.id === itemId && entry.category === encodedCategory
      );

      setIsPubliclyShared(isPublic);

      setStatus((prev) => ({
        ...prev,
        success: `Item is now ${isPublic ? "publicly" : "no longer"
          } accessible!`,
      }));

      if (isPublic) {
        const publicPath =
          itemType === "checklist" ? "public/checklist" : "public/note";
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
            (entry) => entry.id === itemId && entry.category === encodedCategory
          );
          if (hasItem) {
            sharedUsers.push(username);
          }
        }
      });

      const publicItems = sharingData.public || [];
      const isPublic = publicItems.some(
        (entry) => entry.id === itemId && entry.category === encodedCategory
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
    searchQuery,
    setSearchQuery,
    handleUserToggle,
    handleShare,
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
