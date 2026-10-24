import { Checklist } from "@/app/_types";
import { CheckmarkSquare04Icon } from "hugeicons-react";
import { TaskStatusSection } from "./TaskStatusSection";
import { useMemo } from "react";
import { isKanbanType } from "@/app/_types/enums";
import { boardColumns } from "@/app/_utils/kanban/board-utils";
import { NestedChecklistItem } from "../../Checklists/Parts/Simple/NestedChecklistItem";
import { useTranslations } from "next-intl";

export const PublicChecklistBody = ({
  checklist,
  ownerShowsEmojis,
}: {
  checklist: Checklist;
  ownerShowsEmojis?: boolean;
}) => {
  const t = useTranslations();
  const { totalCount } = useMemo(() => {
    const total = checklist.items.length;
    if (total === 0) return { totalCount: 0 };
    return {
      totalCount: total,
    };
  }, [checklist.items]);

  const statusColumns = useMemo(
    () => (isKanbanType(checklist.type) ? boardColumns(checklist) : null),
    [checklist],
  );

  if (totalCount === 0) {
    return (
      <div className="text-center py-12">
        <CheckmarkSquare04Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          {t("checklists.noItemsYet")}
        </h3>
        <p className="text-muted-foreground">
          {t("checklists.emptyChecklist")}
        </p>
      </div>
    );
  }

  if (statusColumns) {
    return statusColumns.map(({ status, items }) => (
      <TaskStatusSection
        key={status.id}
        status={status}
        items={items}
        checklist={checklist}
        ownerShowsEmojis={ownerShowsEmojis}
      />
    ));
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
