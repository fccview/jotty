import { Folder02Icon } from "hugeicons-react";
import { useTranslations } from "next-intl";
import { Toggle } from "@/app/_components/GlobalComponents/FormElements/Toggle";

interface InheritedNoticeProps {
  inheritedFrom: string | null;
  itemOwner: string;
  isOptedOut: boolean;
  isLoading: boolean;
  onToggle: () => void;
}

export const InheritedNotice = ({
  inheritedFrom,
  itemOwner,
  isOptedOut,
  isLoading,
  onToggle,
}: InheritedNoticeProps) => {
  const t = useTranslations();

  if (!inheritedFrom && !isOptedOut) return null;

  return (
    <div className="mx-6 mt-4 mb-3 rounded-jotty border border-dashed border-primary/30 bg-primary/5 px-4 py-3">
      {inheritedFrom && (
        <p className="mb-3 flex items-start gap-2 text-sm lg:text-xs text-muted-foreground">
          <Folder02Icon className="mt-px h-4 w-4 shrink-0 text-primary" />
          <span>{t("sharing.inheritedVia", { category: inheritedFrom, user: itemOwner })}</span>
        </p>
      )}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <label
            htmlFor="share-opt-out"
            className="block text-md lg:text-sm font-medium leading-snug text-foreground"
          >
            {t("sharing.optOut")}
          </label>
          <p className="mt-0.5 text-sm lg:text-xs leading-snug text-muted-foreground">
            {t("sharing.optOutHint")}
          </p>
        </div>
        <Toggle
          id="share-opt-out"
          checked={isOptedOut}
          onCheckedChange={onToggle}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};
