import { ReactNode } from "react";
import { SharedItemCard } from "../../../GlobalComponents/Cards/SharedItemCard";
import { SharedItem } from "@/app/_types";
import { useTranslations } from "next-intl";

export const AdminSharedItemsList = ({
  title,
  items,
  icon,
}: {
  title: string;
  items: SharedItem[];
  icon: ReactNode;
}) => {
  const t = useTranslations();

  return (
    <div className="p-6 rounded-lg border border-border bg-card">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        {icon}
        {title} ({items?.length || 0})
      </h3>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {items?.length > 0 ? (
          items.map((item: SharedItem) => (
            <SharedItemCard key={`${item.owner}-${item.id}`} item={item} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("admin.sharing.no_shared", { type: title.toLowerCase() })}
          </p>
        )}
      </div>
    </div>
  );
};
