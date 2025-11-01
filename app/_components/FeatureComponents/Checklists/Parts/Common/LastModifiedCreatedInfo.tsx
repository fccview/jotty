import { Checklist, Item } from "@/app/_types";
import { Edit2Icon, ListPlus } from "lucide-react";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { encodeCategoryPath } from "@/app/_utils/global-utils";

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const LastModifiedCreatedInfo = ({
  item,
  getUserAvatarUrl,
  checklist,
}: {
  item: Item;
  getUserAvatarUrl: (username: string) => string;
  checklist: Checklist;
}) => {
  const { allSharedItems } = useAppMode();
  const encodedCategory = encodeCategoryPath(checklist.category || "Uncategorized");

  const isShared = allSharedItems?.checklists.some(
    (sharedChecklist) => sharedChecklist.id === checklist.id && sharedChecklist.category === encodedCategory
  );
  return (
    <>
      {(item.createdBy || item.lastModifiedBy) && isShared && (
        <span
          className={`items-center gap-1.5 group-hover/item:hidden hidden lg:flex text-[10px] text-muted-foreground absolute right-3 top-[24px] -translate-y-1/2`}
        >
          {item.createdBy && (
            <span
              className="flex items-center gap-1 bg-muted rounded-md py-1 px-2"
              title={`Created by ${item.createdBy}${item.createdAt
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
                <ListPlus className="h-3 w-3" />
                {item.createdAt ? formatDate(item.createdAt) : ""}
              </span>
            </span>
          )}

          {item.lastModifiedBy && (
            <span
              className="flex items-center gap-1 bg-muted rounded-md py-1 px-2"
              title={`Last modified by ${item.lastModifiedBy}${item.lastModifiedAt
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
                <Edit2Icon className="h-3 w-3" />
                {item.lastModifiedAt ? formatDate(item.lastModifiedAt) : ""}
              </span>
            </span>
          )}
        </span>
      )}
    </>
  );
};

export default LastModifiedCreatedInfo;
