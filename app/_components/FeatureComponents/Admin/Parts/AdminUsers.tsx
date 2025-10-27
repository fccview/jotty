"use client";

import { Search, Plus, Edit3, Trash2, Shield, User } from "lucide-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { User as UserType, Checklist, Note } from "@/app/_types";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { useTranslations } from "next-intl";

interface AdminUsersProps {
  users: UserType[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddUser: () => void;
  onEditUser: (user: UserType) => void;
  onDeleteUser: (user: UserType) => void;
  allLists: Checklist[];
  allDocs: Note[];
  username: string;
  deletingUser: string | null;
}

export const AdminUsers = ({
  users,
  searchQuery,
  onSearchChange,
  onAddUser,
  onEditUser,
  onDeleteUser,
  allLists,
  allDocs,
  username,
  deletingUser,
}: AdminUsersProps) => {
  const t = useTranslations();
  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {t("admin.users.user_management")}
          </h2>
          <p className="text-muted-foreground">
            {t("admin.users.manage_accounts")}
          </p>
        </div>
        <Button onClick={onAddUser} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t("admin.users.add_user")}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t("admin.users.search_users")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
      </div>

      <div className="space-y-3">
        {filteredUsers.map((user) => {
          const userChecklists = allLists.filter(
            (list) => list.owner === user.username
          ).length;
          const userDocs = allDocs.filter(
            (doc) => doc.owner === user.username
          ).length;

          return (
            <div
              key={user.username}
              className="bg-card border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                    <UserAvatar size="lg" username={user.username} avatarUrl={user.avatarUrl} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">
                        {user.username}
                      </h3>
                      {user.username === username && (
                        <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                          {t("global.you")}
                        </span>
                      )}
                      {user.isAdmin && (
                        <Shield className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {user.isAdmin ? t("global.admin") : t("global.user")} • {userChecklists}{" "}
                      {t("checklists.title")}, {userDocs} {t("notes.title")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditUser(user)}
                    className="h-8 w-8 p-0"
                    title={t("admin.users.edit_user")}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  {user.username !== username && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteUser(user)}
                      disabled={deletingUser === user.username}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      title={t("admin.users.delete_user")}
                    >
                      {deletingUser === user.username ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive mx-auto"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? t("admin.users.no_users_found") : t("admin.users.no_users_yet")}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? t("admin.users.no_match")
                : t("admin.users.will_appear")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
