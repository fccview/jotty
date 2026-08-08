import { Folder02Icon } from "hugeicons-react";
import { Toggle } from "@/app/_components/GlobalComponents/FormElements/Toggle";
import { useTranslations } from "next-intl";

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
    <div className="rounded-jotty border border-border bg-muted/30 p-3 space-y-3">
      {inheritedFrom && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Folder02Icon className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {t("sharing.inheritedVia", {
              category: inheritedFrom,
              user: itemOwner,
            })}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{t("sharing.optOut")}</p>
          <p className="text-xs text-muted-foreground">
            {t("sharing.optOutHint")}
          </p>
        </div>
        <Toggle
          checked={isOptedOut}
          onCheckedChange={onToggle}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};
