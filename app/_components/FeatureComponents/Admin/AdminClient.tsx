"use client";

import { useState, useEffect } from "react";
import { SiteHeader } from "@/app/_components/GlobalComponents/Layout/SiteHeader";
import { UserManagementModal } from "@/app/_components/GlobalComponents/Modals/UserModals/UserManagementModal";
import { User, Checklist, Note } from "@/app/_types";
import { deleteUser } from "@/app/_server/actions/users";
import { getAllLists } from "@/app/_server/actions/checklist";
import { getAllNotes } from "@/app/_server/actions/note";
import { AdminTabs } from "./Parts/AdminTabs";
import { AdminOverview } from "./Parts/AdminOverview";
import { AdminUsers } from "./Parts/AdminUsers";
import { AdminContent } from "./Parts/AdminContent";
import { AdminSharing } from "./Parts/Sharing/AdminSharing";
import { AppSettingsTab } from "./Parts/AppSettingsTab";
import { EditorSettingsTab } from "./Parts/EditorSettingsTab";
import { readJsonFile } from "@/app/_server/actions/file";
import { USERS_FILE } from "@/app/_consts/files";
import { StylingTab } from "./Parts/StylingTab";
import { AdminTabs as AdminTabsEnum } from "@/app/_types/enums";
import { Loading } from "../../GlobalComponents/Layout/Loading";

interface AdminClientProps {
  username: string;
}

const getInitialTab = (): AdminTabsEnum => {
  if (typeof window !== "undefined") {
    const hash = window.location.hash.replace("#", "");
    const validTabs = Object.values(AdminTabsEnum);
    if (validTabs.includes(hash as AdminTabsEnum)) {
      return hash as AdminTabsEnum;
    }
  }
  return AdminTabsEnum.OVERVIEW;
};

export const AdminClient = ({ username }: AdminClientProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [allLists, setAllLists] = useState<Checklist[]>([]);
  const [allDocs, setAllDocs] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTabsEnum>(getInitialTab());
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalMode, setUserModalMode] = useState<"add" | "edit">("add");
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  const handleTabChange = (newTab: AdminTabsEnum) => {
    setActiveTab(newTab);
    if (typeof window !== "undefined") {
      window.location.hash = newTab;
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      const validTabs = Object.values(AdminTabsEnum);
      if (validTabs.includes(hash as AdminTabsEnum)) {
        setActiveTab(hash as AdminTabsEnum);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [usersData, listsData, docsData] = await Promise.all([
        readJsonFile(USERS_FILE),
        getAllLists(),
        getAllNotes(),
      ]);

      setUsers(usersData);
      setAllLists(listsData.success && listsData.data ? listsData.data : []);
      setAllDocs(docsData.success && docsData.data ? docsData.data : []);
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
        `Are you sure you want to delete user "${user.username}"? This action cannot be undone.`
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
        alert(result.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user");
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
    adminUsers: users.filter((u) => u.isAdmin).length,
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      <SiteHeader title="Admin Dashboard" />

      <AdminTabs activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="min-h-[600px]">
        {activeTab === AdminTabsEnum.OVERVIEW && (
          <AdminOverview stats={stats} />
        )}
        {activeTab === AdminTabsEnum.USERS && (
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
        {activeTab === AdminTabsEnum.CONTENT && (
          <AdminContent allLists={allLists} allDocs={allDocs} users={users} />
        )}
        {activeTab === AdminTabsEnum.SHARING && <AdminSharing />}
        {activeTab === AdminTabsEnum.SETTINGS && <AppSettingsTab />}
        {activeTab === AdminTabsEnum.EDITOR && <EditorSettingsTab />}
        {activeTab === AdminTabsEnum.STYLING && <StylingTab />}
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
