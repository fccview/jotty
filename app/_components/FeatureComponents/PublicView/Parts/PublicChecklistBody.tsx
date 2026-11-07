import { Checklist, Item } from "@/app/_types";
import { CheckmarkSquare04Icon } from "hugeicons-react";
import { useTranslations } from "next-intl";
import { splitByCompletion } from "@/app/_utils/item-tree-utils";
import { NestedChecklistItem } from "../../Checklists/Parts/Simple/NestedChecklistItem";
import { ChecklistItemsWrapper } from "../../Checklists/Parts/Simple/ChecklistItemsWrapper";

interface PublicChecklistBodyProps {
  checklist: Checklist;
  ownerShowsEmojis?: boolean;
}

const _noop = () => {};

export const PublicChecklistBody = ({ checklist, ownerShowsEmojis }: PublicChecklistBodyProps) => {
  const t = useTranslations();
  const { incompleteItems, completedItems } = splitByCompletion(checklist.items);

  if (checklist.items.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckmarkSquare04Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">{t("checklists.noItemsYet")}</h3>
        <p className="text-muted-foreground">{t("checklists.emptyChecklist")}</p>
      </div>
    );
  }

  const _rows = (items: Item[], offset: number, completed: boolean) =>
    items.map((item, index) => (
      <NestedChecklistItem
        key={item.id}
        item={item}
        index={(offset + index).toString()}
        level={0}
        onToggle={_noop}
        onDelete={_noop}
        completed={completed}
        isPublicView
        ownerShowsEmojis={ownerShowsEmojis}
        isDeletingItem={false}
        isDragDisabled
        checklist={checklist}
      />
    ));

  return (
    <div className="w-full space-y-4">
      {incompleteItems.length > 0 && (
        <ChecklistItemsWrapper title={t("tasks.todo")} count={incompleteItems.length} readOnly>
          {_rows(incompleteItems, 0, false)}
        </ChecklistItemsWrapper>
      )}
      {completedItems.length > 0 && (
        <ChecklistItemsWrapper title={t("tasks.completed")} count={completedItems.length} isCompleted readOnly>
          {_rows(completedItems, incompleteItems.length, true)}
        </ChecklistItemsWrapper>
      )}
    </div>
  );
};
