import React, { useEffect, useState } from "react";
import { cn } from "@/app/_utils/global-utils";
import { getDeterministicColor } from "@/app/_utils/color-utils";
import { getUserByUsername } from "@/app/_server/actions/users";

interface UserAvatarProps {
  username: string;
  avatarUrl?: string | null;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  username,
  avatarUrl,
  className,
  size = "md",
}) => {
  const storedAvatars =
    typeof window !== "undefined" && localStorage.getItem(`avatars`);
  const parsedAvatars = storedAvatars ? JSON.parse(storedAvatars) : {};
  const cachedAvatar = parsedAvatars[username];

  const [avatar, setAvatar] = useState<string | null>(
    avatarUrl !== undefined && avatarUrl !== null ? avatarUrl : cachedAvatar !== undefined ? cachedAvatar : null
  );
  const sizeClasses = {
    xs: "h-4 w-4 text-xs",
    sm: "h-6 w-6 text-sm",
    md: "h-8 w-8 text-base",
    lg: "h-10 w-10 text-lg",
  };

  const words = username.split(" ").filter(Boolean);
  let initials = "";

  if (words.length === 1) {
    initials = username.substring(0, 2).toUpperCase();
  } else if (words.length > 1) {
    initials = (words[0][0] + words[1][0]).toUpperCase();
  }

  const backgroundColor = getDeterministicColor(username);

  useEffect(() => {
    if ((avatarUrl === undefined || avatarUrl === null) && cachedAvatar === undefined) {
      const fetchAvatarUrl = async () => {
        const user = await getUserByUsername(username);
        return user?.avatarUrl || "";
      };

      fetchAvatarUrl().then((url) => {
        setAvatar(url || null);

        localStorage.setItem(
          `avatars`,
          JSON.stringify({
            ...parsedAvatars,
            [username]: url || "",
          })
        );
      });
    }
  }, [avatarUrl, username]);

  return (
    <div
      className={cn(
        "relative rounded-full flex items-center justify-center font-medium text-white flex-shrink-0",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor }}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={`${username}'s avatar`}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <span
          className={`${sizeClasses[size]}${size === "xs" ? " !text-[8px]" : ""
            } flex items-center justify-center`}
        >
          {initials}
        </span>
      )}
    </div>
  );
};
