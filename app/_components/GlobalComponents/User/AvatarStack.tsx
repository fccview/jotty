"use client";

import { useCompactNumber } from "@/app/_hooks/useCompactNumber";
import { cn } from "@/app/_utils/global-utils";
import { UserAvatar } from "./UserAvatar";

interface AvatarStackProps {
  usernames: string[];
  limit: number;
  size: "xs" | "sm";
  title?: string;
}

const OVERFLOW_SIZE = {
  xs: "h-4 min-w-4 px-1 text-[9px] leading-4",
  sm: "h-6 min-w-6 px-1.5 text-[10px] leading-6",
};

export const AvatarStack = ({ usernames, limit, size, title }: AvatarStackProps) => {
  const compact = useCompactNumber();

  if (!usernames.length) return null;

  return (
    <span
      className={cn("flex shrink-0", size === "xs" ? "-space-x-1" : "-space-x-1.5")}
      title={title || usernames.join(", ")}
    >
      {usernames.slice(0, limit).map((username) => (
        <UserAvatar
          key={username}
          username={username}
          size={size}
          className={cn("ring-2 ring-card", size === "sm" && "!text-[10px]")}
        />
      ))}
      {usernames.length > limit && (
        <span
          className={cn(
            "relative z-10 rounded-full bg-muted text-muted-foreground ring-2 ring-card font-mono text-center",
            OVERFLOW_SIZE[size],
          )}
        >
          +{compact(usernames.length - limit)}
        </span>
      )}
    </span>
  );
};
