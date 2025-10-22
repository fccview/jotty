"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { ItemType, User } from "@/app/_types";
import { shareItem, getItemSharingStatus } from "@/app/_server/actions/sharing";
import { readJsonFile } from "@/app/_server/actions/file";
import { USERS_FILE } from "@/app/_consts/files";
import { buildCategoryPath } from "@/app/_utils/global-utils";

interface SharingStatus {
  isShared: boolean;
  isPubliclyShared: boolean;
  sharedWith: string[];
}

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

export const useSharing = ({
  isOpen,
  itemId,
  itemType,
  itemTitle,
  itemCategory,
  itemOwner,
  onClose,
  enabled = true,
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

  const [sharingStatus, setSharingStatus] = useState<SharingStatus | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !itemId || !itemType || !itemOwner) {
      setSharingStatus(null);
      return;
    }

    const loadSharingStatus = async () => {
      setIsLoading(true);
      try {
        const result = await getItemSharingStatus(itemId, itemType, itemOwner);
        if (result.success && result.data) {
          setSharingStatus({
            isShared: result.data.isShared,
            isPubliclyShared: result.data.isPubliclyShared,
            sharedWith: result.data.sharedWith,
          });
        } else {
          setSharingStatus({
            isShared: false,
            isPubliclyShared: false,
            sharedWith: [],
          });
        }
      } catch (error) {
        console.error("Error loading sharing status:", error);
        setSharingStatus({
          isShared: false,
          isPubliclyShared: false,
          sharedWith: [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSharingStatus();
  }, [itemId, itemType, itemOwner, enabled]);

  const resetMessages = () =>
    setStatus((prev) => ({ ...prev, error: null, success: null }));

  const _executeShare = useCallback(
    async (action: string, targetUsers?: string) => {
      setStatus({ isLoading: true, error: null, success: null });
      try {
        const formData = new FormData();
        formData.append("itemId", itemId);
        formData.append("type", itemType);
        formData.append("title", itemTitle);
        formData.append("category", itemCategory || "");
        formData.append("action", action);
        if (targetUsers) formData.append("targetUsers", targetUsers);

        const result = await shareItem(formData);
        if (!result.success)
          throw new Error(result.error || "An unknown error occurred.");

        return result;
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

  const loadInitialState = useCallback(async () => {
    if (!isOpen) return;
    setStatus({ isLoading: true, error: null, success: null });
    try {
      const [usersData, sharingStatus] = await Promise.all([
        readJsonFile(USERS_FILE),
        getItemSharingStatus(itemId, itemType, itemOwner),
      ]);
      setUsers(usersData);
      if (sharingStatus.success && sharingStatus.data) {
        const { sharedWith, isPubliclyShared: isPublic } = sharingStatus.data;
        setCurrentSharing(sharedWith);
        setSelectedUsers(sharedWith);
        setIsPubliclyShared(isPublic || false);
        if (isPublic) {
          const publicPath =
            itemType === "checklist" ? "public/checklist" : "public/note";
          const categoryPath = buildCategoryPath(
            itemCategory || "Uncategorized",
            itemId
          );
          setPublicUrl(
            `${window.location.origin}/${publicPath}/${categoryPath}`
          );
        }
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
  }, [isOpen, itemId, itemType, itemOwner]);

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

  const handleShare = async () => {
    const result = await _executeShare("share", selectedUsers.join(","));
    if (result?.success) {
      setCurrentSharing(selectedUsers);
      setStatus((prev) => ({
        ...prev,
        success: "Sharing updated successfully!",
      }));
      setTimeout(onClose, 1500);
    }
  };

  const handlePublicToggle = async () => {
    const action = isPubliclyShared ? "unshare-public" : "share-public";
    const result = await _executeShare(action);
    if (result?.success) {
      const newPublicState = !isPubliclyShared;
      setIsPubliclyShared(newPublicState);
      setStatus((prev) => ({
        ...prev,
        success: `Item is now ${
          newPublicState ? "publicly" : "no longer"
        } accessible!`,
      }));
      if (newPublicState) {
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
    }
  };

  const handleRemoveAllSharing = async () => {
    const result = await _executeShare("unshare");
    if (result?.success) {
      setCurrentSharing([]);
      setSelectedUsers([]);
      setStatus((prev) => ({
        ...prev,
        success: "All sharing has been removed.",
      }));
      setTimeout(onClose, 1500);
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
    sharingStatus,
    isLoading,
  };
};
