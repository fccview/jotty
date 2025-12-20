import { usePermissions } from "@/app/_providers/PermissionsProvider";
import { useTranslations } from "next-intl";

interface checklistItemsWrapperProps {
  title: string;
  count: number;
  children: React.ReactNode;
  onBulkToggle: () => void;
  isLoading: boolean;
  isCompleted?: boolean;
}

export const ChecklistItemsWrapper = ({
  title,
  count,
  children,
  onBulkToggle,
  isLoading,
  isCompleted = false,
}: checklistItemsWrapperProps) => {
  const t = useTranslations();
  const { permissions } = usePermissions();
  return (
    <div className="bg-card border-b border-border pb-4 lg:border-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isCompleted ? "bg-green-500" : "bg-muted-foreground"
            }`}
          ></div>
          {title} ({count})
          {isLoading && (
            <span className="ml-2 text-sm text-muted-foreground">{t('common.saving')}</span>
          )}
        </h3>
        {permissions?.canEdit && (
          <button
            onClick={onBulkToggle}
            disabled={isLoading}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isCompleted ? "Uncheck All" : "Check All"}
          </button>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
};
