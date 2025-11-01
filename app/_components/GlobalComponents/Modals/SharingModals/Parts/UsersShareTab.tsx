import { User } from "@/app/_types";
import { Search, UserPlus, UserMinus, Loader2 } from "lucide-react";
import { UserAvatar } from "../../../User/UserAvatar";
import { Button } from "../../../Buttons/Button";
import { cn } from "@/app/_utils/global-utils";

export const UsersShareTab = ({
  filteredUsers,
  currentSharing,
  handleShare,
  searchQuery,
  setSearchQuery,
  isLoading,
}: any) => {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
            return (
              <div
                key={user.username}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent"
              >
                <div className="flex items-center">
                  <UserAvatar
                    size="sm"
                    className="mr-2"
                    username={user.username}
                    avatarUrl={user.avatarUrl}
                  />
                  <span className="text-sm font-medium">{user.username}</span>
                  {isShared && (
                    <span className="ml-2 text-xs text-primary font-medium">
                      Shared
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={isShared ? "outline" : "default"}
                  onClick={() =>
                    handleShare(isShared ? "unshare" : "share", user.username)
                  }
                  disabled={isLoading}
                  className={cn(
                    "min-w-[80px]",
                    isShared && "text-destructive hover:text-destructive"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : isShared ? (
                    <>
                      <UserMinus className="h-3 w-3 mr-1" />
                      Unshare
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3 w-3 mr-1" />
                      Share
                    </>
                  )}
                </Button>
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
