import { Item } from "@/app/_types";
import { PencilIcon, PlusIcon } from "lucide-react";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import { useTranslations } from "next-intl";

const LastModifiedCreatedInfo = ({
  item,
  isShared,
  getUserAvatarUrl,
}: {
  item: Item;
  isShared: boolean;
  getUserAvatarUrl: (username: string) => string;
}) => {
  const t = useTranslations();

  return (
    <>
      {(item.createdBy || item.lastModifiedBy) && isShared && (
        <span
          className={`items-center gap-1.5 group-hover/item:hidden hidden lg:flex text-[10px] text-muted-foreground absolute right-3 top-[24px] -translate-y-1/2`}
        >
          {item.createdBy && (
            <span
              className="flex items-center gap-1 bg-muted rounded-md py-1 px-2"
              title={`${t("checklists.created_by", { username: item.createdBy })}${item.createdAt
                ? t("checklists.created_on", { date: new Date(item.createdAt).toLocaleString() })
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
              title={`${t("checklists.last_modified_by", { username: item.lastModifiedBy })}${item.lastModifiedAt
                ? t("checklists.last_modified_on", { date: new Date(item.lastModifiedAt).toLocaleString() })
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
