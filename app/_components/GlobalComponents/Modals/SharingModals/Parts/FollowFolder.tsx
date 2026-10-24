import { Folder02Icon } from "hugeicons-react";
import { useTranslations } from "next-intl";
import { Toggle } from "@/app/_components/GlobalComponents/FormElements/Toggle";

interface FollowFolderProps {
  folder: string | null;
  isFollowing: boolean;
  isLoading: boolean;
  onToggle: () => void;
}

export const FollowFolder = ({
  folder,
  isFollowing,
  isLoading,
  onToggle,
}: FollowFolderProps) => {
  const t = useTranslations();

  if (!folder) return null;

  return (
    <div className="mx-6 mt-4 mb-3 flex items-center justify-between gap-4 rounded-jotty border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex min-w-0 items-start gap-2">
        <Folder02Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <label
            htmlFor="share-follow-folder"
            className="block text-md lg:text-sm font-medium leading-snug text-foreground"
          >
            {t("sharing.followFolder")}
          </label>
          <p className="mt-0.5 text-sm lg:text-xs leading-snug text-muted-foreground">
            {t(isFollowing ? "sharing.followingHint" : "sharing.customHint", {
              category: folder,
            })}
          </p>
        </div>
      </div>
      <Toggle
        id="share-follow-folder"
        checked={isFollowing}
        onCheckedChange={onToggle}
        disabled={isLoading}
      />
    </div>
  );
};
