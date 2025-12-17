import { Checklist, Item } from "@/app/_types";
import { PencilEdit02Icon, Clock01Icon } from "hugeicons-react";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { encodeCategoryPath } from "@/app/_utils/global-utils";
import { usePreferredDateTime } from "@/app/_hooks/usePreferredDateTime";

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
  const { formatDateTimeString } = usePreferredDateTime();
  const encodedCategory = encodeCategoryPath(
    checklist.category || "Uncategorized"
  );

  const isShared = allSharedItems?.checklists.some(
    (sharedChecklist) =>
      sharedChecklist.id === checklist.id &&
      sharedChecklist.category === encodedCategory
  );
  return (
    <>
      {(item.createdBy || item.lastModifiedBy) && isShared && (
        <span
          className={`items-center gap-1.5 group-hover/item:hidden hidden lg:flex text-[10px] text-muted-foreground absolute right-3 top-[24px] -translate-y-1/2`}
        >
          {item.createdBy && (
            <span
              className="flex items-center gap-1 bg-muted rounded-jotty py-1 px-2"
              title={`Created by ${item.createdBy}${
                item.createdAt
                  ? ` on ${formatDateTimeString(item.createdAt)}`
                  : ""
              }`}
            >
              <UserAvatar
                username={item.createdBy}
                size="xs"
                avatarUrl={getUserAvatarUrl(item.createdBy) || ""}
              />
              <span className="flex items-center gap-1">
                <Clock01Icon className="h-3 w-3" />
                {item.createdAt ? formatDateTimeString(item.createdAt) : ""}
              </span>
            </span>
          )}

          {item.lastModifiedBy && (
            <span
              className="flex items-center gap-1 bg-muted rounded-jotty py-1 px-2"
              title={`Last modified by ${item.lastModifiedBy}${
                item.lastModifiedAt
                  ? ` on ${formatDateTimeString(item.lastModifiedAt)}`
                  : ""
              }`}
            >
              <UserAvatar
                username={item.lastModifiedBy}
                size="xs"
                avatarUrl={getUserAvatarUrl(item.lastModifiedBy) || ""}
              />
              <span className="flex items-center gap-1">
                <PencilEdit02Icon className="h-3 w-3" />
                {item.lastModifiedAt
                  ? formatDateTimeString(item.lastModifiedAt)
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
