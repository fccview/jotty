import { Checklist } from "@/app/_types";
import { CheckmarkSquare04Icon } from "hugeicons-react";
import { useTranslations } from "next-intl";
import { NestedChecklistItem } from "../../Checklists/Parts/Simple/NestedChecklistItem";

export const PublicChecklistBody = ({
  checklist,
  ownerShowsEmojis,
}: {
  checklist: Checklist;
  ownerShowsEmojis?: boolean;
}) => {
  const t = useTranslations();

  if (checklist.items.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckmarkSquare04Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">{t("checklists.noItemsYet")}</h3>
        <p className="text-muted-foreground">{t("checklists.emptyChecklist")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {checklist.items.map((item, index) => (
        <NestedChecklistItem
          key={item.id}
          item={item}
          index={index.toString()}
          level={0}
          onToggle={() => {}}
          onDelete={() => {}}
          isPublicView={true}
          ownerShowsEmojis={ownerShowsEmojis}
          isDeletingItem={false}
          isDragDisabled={true}
          checklist={checklist}
        />
      ))}
    </div>
  );
};
