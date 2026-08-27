"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdminUsers } from "@/app/_components/FeatureComponents/Admin/Parts/AdminUsers";
import { UserManagementModal } from "@/app/_components/GlobalComponents/Modals/UserModals/UserManagementModal";
import { SanitisedUser, Checklist, Note } from "@/app/_types";
import { deleteUser, getUsersForAdmin } from "@/app/_server/actions/users";
import { useToast } from "@/app/_providers/ToastProvider";
import { ConfirmModal } from "@/app/_components/GlobalComponents/Modals/ConfirmationModals/ConfirmModal";

interface AdminUsersClientProps {
  initialUsers: SanitisedUser[];
  initialLists: Checklist[];
  initialDocs: Note[];
  username: string;
}

export function AdminUsersClient({ initialUsers, initialLists, initialDocs, username }: AdminUsersClientProps) {
  const t = useTranslations();
  const { showToast } = useToast();
  const [users, setUsers] = useState<SanitisedUser[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalMode, setUserModalMode] = useState<"add" | "edit">("add");
  const [selectedUser, setSelectedUser] = useState<SanitisedUser | undefined>(undefined);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SanitisedUser | null>(null);

  const loadData = async () => {
    try {
      setUsers(await getUsersForAdmin());
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleAddUser = () => {
    setUserModalMode("add");
    setSelectedUser(undefined);
    setShowUserModal(true);
  };

  const handleEditUser = (user: SanitisedUser) => {
    setUserModalMode("edit");
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = (user: SanitisedUser) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    setShowDeleteModal(false);
    setDeletingUser(userToDelete.username);
    try {
      const formData = new FormData();
      formData.append("username", userToDelete.username);

      const result = await deleteUser(formData);

      if (result.success) {
        setUsers((prev) => prev.filter((u) => u.username !== userToDelete.username));
      } else {
        showToast({
          type: "error",
          title: t('common.error'),
          message: result.error || t('errors.failedToDeleteUser'),
        });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast({
        type: "error",
        title: t('common.error'),
        message: t('errors.failedToDeleteUser'),
      });
    } finally {
      setDeletingUser(null);
      setUserToDelete(null);
    }
  };

  return (
    <>
      <AdminUsers
        users={users}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddUser={handleAddUser}
        onEditUser={handleEditUser}
        onDeleteUser={handleDeleteUser}
        allLists={initialLists}
        allDocs={initialDocs}
        username={username}
        deletingUser={deletingUser}
      />
      <UserManagementModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        mode={userModalMode}
        user={selectedUser}
        onSuccess={loadData}
      />

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDeleteUser}
        title={t("common.delete")}
        message={t('admin.deleteUserConfirmation', { username: userToDelete?.username || "" })}
        confirmText={t("common.delete")}
        variant="destructive"
      />
    </>
  );
}
