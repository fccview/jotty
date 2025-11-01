import { Checklist, Item } from "@/app/_types";
import { CheckSquare } from "lucide-react";
import { TaskStatusSection } from "./TaskStatusSection";
import { useMemo } from "react";
import { TaskStatus } from "@/app/_types/enums";
import { NestedChecklistItem } from "../../Checklists/Parts/Simple/NestedChecklistItem";

export const PublicChecklistBody = ({
  checklist,
}: {
  checklist: Checklist;
}) => {
  const { totalCount } = useMemo(() => {
    const total = checklist.items.length;
    if (total === 0) return { totalCount: 0 };
    return {
      totalCount: total,
    };
  }, [checklist.items]);

  const taskItemsByStatus = useMemo(() => {
    if (checklist.type !== "task") return null;
    const initialAcc: Record<string, Item[]> = {
      todo: [],
      in_progress: [],
      paused: [],
      completed: [],
    };
    return checklist.items.reduce((acc, item) => {
      const status = item.status || TaskStatus.TODO;
      if (acc[status]) acc[status].push(item);
      return acc;
    }, initialAcc);
  }, [checklist.items, checklist.type]);

  if (totalCount === 0) {
    return (
      <div className="text-center py-12">
        <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          No items yet
        </h3>
        <p className="text-muted-foreground">This checklist is empty.</p>
      </div>
    );
  }

  if (checklist.type === "task" && taskItemsByStatus) {
    return Object.entries(taskItemsByStatus).map(([status, items]) => (
      <TaskStatusSection key={status} status={status} items={items} checklist={checklist} />
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
          onToggle={() => { }}
          onDelete={() => { }}
          isPublicView={true}
          isDeletingItem={false}
          isDragDisabled={true}
          checklist={checklist}
        />
      ))}
    </div>
  );
};
