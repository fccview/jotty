import { ReactNode } from "react";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";

interface ShareeRowProps {
  username: string;
  avatarUrl?: string;
  controls?: ReactNode;
  action?: ReactNode;
}

export const ShareeRow = ({ username, avatarUrl, controls, action }: ShareeRowProps) => (
  <div className="jotty-sharee-row flex min-h-12 items-center gap-3 px-6 py-2 transition-colors hover:bg-muted/30">
    <UserAvatar size="md" username={username} avatarUrl={avatarUrl} />
    <p
      className="min-w-0 flex-1 truncate text-md lg:text-sm font-medium text-foreground"
      title={username}
    >
      {username}
    </p>
    {controls}
    {action}
  </div>
);
