import { Item } from "@/app/_types";
import { PencilIcon, PlusIcon } from "lucide-react";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";

const LastModifiedCreatedInfo = ({
  item,
  isShared,
  getUserAvatarUrl,
}: {
  item: Item;
  isShared: boolean;
  getUserAvatarUrl: (username: string) => string;
}) => {
  return (
    <>
      {(item.createdBy || item.lastModifiedBy) && isShared && (
        <span
          className={`items-center gap-1.5 group-hover/item:hidden hidden lg:flex text-[10px] text-muted-foreground absolute right-3 top-[24px] -translate-y-1/2`}
        >
          {item.createdBy && (
            <span
              className="flex items-center gap-1 bg-muted rounded-md py-1 px-2"
              title={`Created by ${item.createdBy}${
                item.createdAt
                  ? ` on ${new Date(item.createdAt).toLocaleString()}`
                  : ""
              }`}
            >
              <UserAvatar
                username={item.createdBy}
                size="xs"
                avatarUrl={getUserAvatarUrl(item.createdBy) || ""}
              />
              <span className="flex items-center gap-1">
                <PlusIcon className="h-3 w-3" />
                {item.createdAt ? new Date(item.createdAt).toDateString() : ""}
              </span>
            </span>
          )}

          {item.lastModifiedBy && (
            <span
              className="flex items-center gap-1 bg-muted rounded-md py-1 px-2"
              title={`Last modified by ${item.lastModifiedBy}${
                item.lastModifiedAt
                  ? ` on ${new Date(item.lastModifiedAt).toLocaleString()}`
                  : ""
              }`}
            >
              <UserAvatar
                username={item.lastModifiedBy}
                size="xs"
                avatarUrl={getUserAvatarUrl(item.lastModifiedBy) || ""}
              />
              <span className="flex items-center gap-1">
                <PencilIcon className="h-3 w-3" />
                {item.lastModifiedAt
                  ? new Date(item.lastModifiedAt).toDateString()
                  : ""}
              </span>
            </span>
          )}
        </span>
      )}
    </>
  );
};

export default LastModifiedCreatedInfo;
