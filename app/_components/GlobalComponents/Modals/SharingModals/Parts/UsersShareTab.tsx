import { User } from "@/app/_types";
import {
  Search01Icon,
  UserAdd01Icon,
  UserMinus02Icon,
  Orbit01Icon,
  ViewIcon,
  PencilEdit02Icon,
  Delete03Icon,
  Settings01Icon,
} from "hugeicons-react";
import { UserAvatar } from "../../../User/UserAvatar";
import { Button } from "../../../Buttons/Button";
import { Toggle } from "@/app/_components/GlobalComponents/FormElements/Toggle";
import { cn } from "@/app/_utils/global-utils";

export const UsersShareTab = ({
  filteredUsers,
  currentSharing,
  selectedUsers,
  userPermissions,
  handleShare,
  handlePermissionChange,
  handleAllPermissionsChange,
  searchQuery,
  setSearchQuery,
  isLoading,
}: any) => {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search01Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="max-h-48 overflow-y-auto">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user: User) => {
            const isShared = currentSharing.includes(user.username);
            const isSelected = selectedUsers.includes(user.username);
            const permissions = userPermissions[user.username] || {
              canRead: true,
              canEdit: false,
              canDelete: false,
            };
            const hasAllPermissions =
              permissions.canRead &&
              permissions.canEdit &&
              permissions.canDelete;

            return (
              <div
                key={user.username}
                className="p-3 rounded-lg border hover:bg-accent/50"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <UserAvatar
                      size="sm"
                      className="mt-0.5 flex-shrink-0"
                      username={user.username}
                      avatarUrl={user.avatarUrl}
                    />
                    <div className="min-w-0 flex items-center gap-2">
                      <div className="text-sm font-medium truncate">
                        {user.username}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {isShared && (
                      <button
                        onClick={() =>
                          handleAllPermissionsChange(
                            user.username,
                            !hasAllPermissions
                          )
                        }
                        disabled={isLoading}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors disabled:opacity-50"
                        title="Toggle all permissions"
                      >
                        <Settings01Icon className="h-3 w-3 text-primary" />
                        <Toggle
                          size="sm"
                          checked={hasAllPermissions}
                          onCheckedChange={(checked: boolean) =>
                            handleAllPermissionsChange(user.username, checked)
                          }
                          disabled={isLoading}
                        />
                      </button>
                    )}
                    <Button
                      size="sm"
                      variant={isShared ? "outline" : "default"}
                      onClick={() =>
                        handleShare(
                          isShared ? "unshare" : "share",
                          user.username
                        )
                      }
                      disabled={isLoading}
                      className={cn(
                        `w-full min-w-[80px]`,
                        isShared &&
                          "text-destructive hover:text-destructive min-w-[10px]"
                      )}
                    >
                      {isLoading ? (
                        <Orbit01Icon className="h-3 w-3 animate-spin" />
                      ) : isShared ? (
                        <UserMinus02Icon className="h-3 w-3 mr-1" />
                      ) : (
                        <>
                          <UserAdd01Icon className="h-3 w-3 mr-1" />
                          Share
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {(isShared || isSelected) && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between gap-2 pt-4 border-t border-border">
                      <button
                        onClick={() =>
                          handlePermissionChange(
                            user.username,
                            "canRead",
                            !permissions.canRead
                          )
                        }
                        disabled={isLoading}
                        className="flex items-center gap-1 py-1 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors disabled:opacity-50"
                      >
                        <ViewIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium">Read</span>
                        <Toggle
                          size="sm"
                          checked={permissions.canRead}
                          onCheckedChange={(checked: boolean) =>
                            handlePermissionChange(
                              user.username,
                              "canRead",
                              checked
                            )
                          }
                          disabled={isLoading}
                        />
                      </button>

                      <button
                        onClick={() =>
                          handlePermissionChange(
                            user.username,
                            "canEdit",
                            !permissions.canEdit
                          )
                        }
                        disabled={isLoading}
                        className="flex items-center gap-1 py-1 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors disabled:opacity-50"
                      >
                        <PencilEdit02Icon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium">Edit</span>
                        <Toggle
                          size="sm"
                          checked={permissions.canEdit}
                          onCheckedChange={(checked: boolean) =>
                            handlePermissionChange(
                              user.username,
                              "canEdit",
                              checked
                            )
                          }
                          disabled={isLoading}
                        />
                      </button>

                      <button
                        onClick={() =>
                          handlePermissionChange(
                            user.username,
                            "canDelete",
                            !permissions.canDelete
                          )
                        }
                        disabled={isLoading}
                        className="flex items-center gap-1 py-1 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors disabled:opacity-50"
                      >
                        <Delete03Icon className="h-3 w-3 text-destructive" />
                        <span className="text-xs font-medium">Delete</span>
                        <Toggle
                          size="sm"
                          checked={permissions.canDelete}
                          onCheckedChange={(checked: boolean) =>
                            handlePermissionChange(
                              user.username,
                              "canDelete",
                              checked
                            )
                          }
                          disabled={isLoading}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-center text-sm text-muted-foreground py-4">
            No users found.
          </p>
        )}
      </div>
    </div>
  );
};
