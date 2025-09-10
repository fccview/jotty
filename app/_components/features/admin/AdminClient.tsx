"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckSquare,
  FileText,
} from "lucide-react";
import { Button } from "@/app/_components/ui/elements/button";
import { UserManagementModal } from "@/app/_components/ui/modals/user/UserManagementModal";
import { User, Checklist, Document } from "@/app/_types";
import { readUsers } from "@/app/_server/actions/auth/utils";
import { getAllLists } from "@/app/_server/actions/data/actions";
import { getAllDocs } from "@/app/_server/actions/data/docs-actions";
import { getSharedItemsAction } from "@/app/_server/actions/sharing/get-shared-items";
import { deleteUserAction } from "@/app/_server/actions/users/delete-user";
import { useRouter } from "next/navigation";
import { AdminTabs } from "./components/AdminTabs";
import { AdminOverview } from "./components/AdminOverview";
import { AdminUsers } from "./components/AdminUsers";

interface AdminClientProps {
  username: string;
}

export function AdminClient({ username }: AdminClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [allLists, setAllLists] = useState<Checklist[]>([]);
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [sharedItems, setSharedItems] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "content" | "sharing"
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
      const [usersData, listsData, docsData, sharedData] = await Promise.all([
        readUsers(),
        getAllLists(),
        getAllDocs(),
        getSharedItemsAction(),
      ]);

      setUsers(usersData);
      setAllLists(listsData.success && listsData.data ? listsData.data : []);
      setAllDocs(docsData.success && docsData.data ? docsData.data : []);
      setSharedItems(
        sharedData.success && sharedData.data ? sharedData.data : {}
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
        `Are you sure you want to delete user "${user.username}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingUser(user.username);
    try {
      const formData = new FormData();
      formData.append("username", user.username);

      const result = await deleteUserAction(formData);

      if (result.success) {
        // Remove user from local state
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

  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalUsers: users.length,
    totalChecklists: allLists.length,
    totalDocuments: allDocs.length,
    sharedChecklists: sharedItems.sharedWithMe?.checklists?.length || 0,
    sharedDocuments: sharedItems.sharedWithMe?.documents?.length || 0,
    adminUsers: users.filter((u) => u.isAdmin).length,
  };

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">User Management</h2>
        <Button onClick={handleAddUser}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="bg-background border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((user) => {
                const userChecklists = allLists.filter(
                  (list) => list.owner === user.username
                ).length;
                const userDocs = allDocs.filter(
                  (doc) => doc.owner === user.username
                ).length;

                return (
                  <tr key={user.username} className="hover:bg-muted/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium">
                          {user.username}
                        </div>
                        {user.username === username && (
                          <span className="ml-2 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.isAdmin
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {user.isAdmin ? "Admin" : "User"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {userChecklists} checklists, {userDocs} documents
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          title="Edit User"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        {user.username !== username && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            disabled={deletingUser === user.username}
                            className="text-destructive"
                            title="Delete User"
                          >
                            {deletingUser === user.username ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive mx-auto"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">All Content</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {allLists.length + allDocs.length} total items
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Checklists ({allLists.length})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {allLists.map((list) => (
              <div
                key={list.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{list.title}</p>
                  <p className="text-sm text-muted-foreground">
                    by {list.owner} • {list.category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {list.isShared && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      Shared
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-background border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents ({allDocs.length})
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {allDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{doc.title}</p>
                  <p className="text-sm text-muted-foreground">
                    by {doc.owner} • {doc.category}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {doc.isShared && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      Shared
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSharing = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Sharing Overview</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-background border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Shared With Me Checklists
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sharedItems.sharedWithMe?.checklists?.length > 0 ? (
              sharedItems.sharedWithMe.checklists.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      shared by {item.owner}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No shared checklists
              </p>
            )}
          </div>
        </div>

        <div className="bg-background border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Shared With Me Documents
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sharedItems.sharedWithMe?.documents?.length > 0 ? (
              sharedItems.sharedWithMe.documents.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      shared by {item.owner}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No shared documents
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Manage users, content, and system settings
            </p>
          </div>
        </div>
      </div>

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
          />
        )}
        {activeTab === "content" && renderContent()}
        {activeTab === "sharing" && renderSharing()}
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
}
