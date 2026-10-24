import { cn } from "@/app/_utils/global-utils";
import { Checklist, Item, KanbanStatus } from "@/app/_types";
import { TASK_STATUS_CONFIG } from "@/app/_consts/checklists";
import { NestedChecklistItem } from "../../Checklists/Parts/Simple/NestedChecklistItem";

export const TaskStatusSection = ({
  status,
  items,
  checklist,
  ownerShowsEmojis,
}: {
  status: KanbanStatus;
  items: Item[];
  checklist: Checklist;
  ownerShowsEmojis?: boolean;
}) => {
  if (items.length === 0) return null;

  const config =
    TASK_STATUS_CONFIG[status.id as keyof typeof TASK_STATUS_CONFIG];

  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
        {config && !status.color ? (
          <config.Icon className={cn("h-5 w-5", config.iconClassName)} />
        ) : (
          <span
            className="w-3 h-3 rounded-full shrink-0 bg-muted-foreground"
            style={status.color ? { backgroundColor: status.color } : undefined}
          />
        )}
        {status.label} ({items.length})
      </h3>

      <div className="space-y-2">
        {items.map((item, index) => (
          <NestedChecklistItem
            key={item.id}
            item={item}
            index={index.toString()}
            level={0}
            onToggle={() => { }}
            onDelete={() => { }}
            isPublicView={true}
            ownerShowsEmojis={ownerShowsEmojis}
            isDeletingItem={false}
            isDragDisabled={true}
            checklist={checklist}
          />
        ))}
      </div>
    </div>
  );
};
