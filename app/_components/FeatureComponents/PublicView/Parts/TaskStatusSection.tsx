import { cn } from "@/app/_utils/global-utils";
import { Item } from "@/app/_types";
import { TASK_STATUS_CONFIG } from "@/app/_consts/checklists";
import { NestedChecklistItem } from "../../Checklists/Parts/Simple/NestedChecklistItem";

export const TaskStatusSection = ({
  status,
  items,
}: {
  status: string;
  items: Item[];
}) => {
  const config = TASK_STATUS_CONFIG[status as keyof typeof TASK_STATUS_CONFIG];
  if (!config || items.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
        <config.Icon className={cn("h-5 w-5", config.iconClassName)} />
        {config.title} ({items.length})
      </h3>

      <div className="space-y-2">
        {items.map((item, index) => (
          <NestedChecklistItem
            key={item.id}
            item={item}
            index={index.toString()}
            level={0}
            onToggle={() => {}}
            onDelete={() => {}}
            isPublicView={true}
            isDeletingItem={false}
            isDragDisabled={true}
            isShared={true}
          />
        ))}
      </div>
    </div>
  );
};
