"use client";

import {
  Search01Icon,
  Add01Icon,
  UserEdit01Icon,
  Delete03Icon,
  ShieldUserIcon,
  UserIcon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { User as UserType, Checklist, Note } from "@/app/_types";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
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
      <div className="flex items-center justify-end">
        <Button onClick={onAddUser} className="flex items-center gap-2">
          <Add01Icon className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="relative">
        <Search01Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input
          id="searchUsers"
          name="searchUsers"
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
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
              className="bg-card border border-border rounded-jotty p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                    <UserAvatar
                      size="lg"
                      username={user.username}
                      avatarUrl={user.avatarUrl}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">
                        {user.username}
                      </h3>
                      {user.username === username && (
                        <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                          You
                        </span>
                      )}
                      {user.isAdmin && (
                        <ShieldUserIcon className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {user.isAdmin ? "Admin" : "User"} • {userChecklists}{" "}
                      checklists, {userDocs} notes
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditUser(user)}
                    className="h-8 w-8 p-0"
                    title={t('admin.editUser')}
                  >
                    <UserEdit01Icon className="h-4 w-4" />
                  </Button>
                  {user.username !== username && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDeleteUser(user)}
                      disabled={deletingUser === user.username}
                      className="h-8 w-8 p-0"
                      title={t('admin.deleteUser')}
                    >
                      {deletingUser === user.username ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive mx-auto"></div>
                      ) : (
                        <Delete03Icon className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="bg-card border border-border rounded-jotty p-8 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <UserIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchQuery ? "No users found" : "No users yet"}
            </h3>
            <p className="text-muted-foreground">
              {searchQuery
                ? "No users match your search criteria."
                : "Users will appear here once they register."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
