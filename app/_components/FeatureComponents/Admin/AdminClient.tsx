"use client";

import { useState, useEffect } from "react";
import { SiteHeader } from "@/app/_components/GlobalComponents/Layout/SiteHeader";
import { UserManagementModal } from "@/app/_components/GlobalComponents/Modals/UserModals/UserManagementModal";
import { User, Checklist, Note } from "@/app/_types";
import { deleteUser } from "@/app/_server/actions/users";
import { getAllLists } from "@/app/_server/actions/checklist";
import { getAllNotes } from "@/app/_server/actions/note";
import { getGlobalSharing } from "@/app/_server/actions/sharing";
import { useRouter } from "next/navigation";
import { AdminTabs } from "./Parts/AdminTabs";
import { AdminOverview } from "./Parts/AdminOverview";
import { AdminUsers } from "./Parts/AdminUsers";
import { AdminContent } from "./Parts/AdminContent";
import { AdminSharing } from "./Parts/AdminSharing";
import { AppSettingsTab } from "./Parts/AppSettingsTab";
import { EditorSettingsTab } from "./Parts/EditorSettingsTab";
import { readJsonFile } from "@/app/_server/actions/file";
import { USERS_FILE } from "@/app/_consts/files";
import { useTranslations } from "next-intl";

interface AdminClientProps {
  username: string;
}

export const AdminClient = ({ username }: AdminClientProps) => {
  const t = useTranslations();
  const [users, setUsers] = useState<User[]>([]);
  const [allLists, setAllLists] = useState<Checklist[]>([]);
  const [allDocs, setAllDocs] = useState<Note[]>([]);
  const [globalSharing, setGlobalSharing] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "content" | "sharing" | "settings" | "editor"
  >("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalMode, setUserModalMode] = useState<"add" | "edit">("add");
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [usersData, listsData, docsData, sharingData] = await Promise.all([
        readJsonFile(USERS_FILE),
        getAllLists(),
        getAllNotes(),
        getGlobalSharing(),
      ]);

      setUsers(usersData);
      setAllLists(listsData.success && listsData.data ? listsData.data : []);
      setAllDocs(docsData.success && docsData.data ? docsData.data : []);
      setGlobalSharing(
        sharingData.success && sharingData.data ? sharingData.data : {}
      );
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = () => {
    setUserModalMode("add");
    setSelectedUser(undefined);
    setShowUserModal(true);
  };

  const handleEditUser = (user: User) => {
    setUserModalMode("edit");
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (
      !confirm(
        t("admin.delete_user_confirmation_with_name", { username: user.username })
      )
    ) {
      return;
    }

    setDeletingUser(user.username);
    try {
      const formData = new FormData();
      formData.append("username", user.username);

      const result = await deleteUser(formData);

      if (result.success) {
        setUsers((prev) => prev.filter((u) => u.username !== user.username));
      } else {
        alert(result.error || t("admin.failed_to_delete_user"));
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(t("admin.failed_to_delete_user"));
    } finally {
      setDeletingUser(null);
    }
  };

  const handleUserModalSuccess = () => {
    loadAdminData();
  };

  const stats = {
    totalUsers: users.length,
    totalChecklists: allLists.length,
    totalNotes: allDocs.length,
    sharedChecklists: globalSharing.sharingStats?.totalSharedChecklists || 0,
    sharedNotes: globalSharing.sharingStats?.totalSharedNotes || 0,
    totalSharingRelationships:
      globalSharing.sharingStats?.totalSharingRelationships || 0,
    adminUsers: users.filter((u) => u.isAdmin).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("admin.loading_dashboard")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SiteHeader
        title={t("admin.dashboard_title")}
        description={t("admin.dashboard_description")}
      />

      <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="min-h-[600px]">
        {activeTab === "overview" && <AdminOverview stats={stats} />}
        {activeTab === "users" && (
          <AdminUsers
            users={users}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAddUser={handleAddUser}
            onEditUser={handleEditUser}
            onDeleteUser={handleDeleteUser}
            allLists={allLists}
            allDocs={allDocs}
            username={username}
            deletingUser={deletingUser}
          />
        )}
        {activeTab === "content" && (
          <AdminContent allLists={allLists} allDocs={allDocs} users={users} />
        )}
        {activeTab === "sharing" && (
          <AdminSharing globalSharing={globalSharing} />
        )}
        {activeTab === "settings" && <AppSettingsTab />}
        {activeTab === "editor" && <EditorSettingsTab />}
      </div>

      <UserManagementModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        mode={userModalMode}
        user={selectedUser}
        onSuccess={handleUserModalSuccess}
      />
    </div>
  );
};
