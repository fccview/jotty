"use client";

import { Checklist } from "@/app/_types";
import { statusColor } from "@/app/_consts/kanban";
import { boardColumns } from "@/app/_utils/kanban/board-utils";
import { KanbanGrid } from "@/app/_components/FeatureComponents/Kanban/KanbanGrid";
import { KanbanColumnFrame } from "@/app/_components/FeatureComponents/Kanban/KanbanColumnFrame";
import { KanbanCardHead } from "@/app/_components/FeatureComponents/Kanban/KanbanCardHead";
import { KanbanCardFace, KanbanCardShell } from "@/app/_components/FeatureComponents/Kanban/KanbanCardFace";

export const PublicBoard = ({ checklist }: { checklist: Checklist }) => {
  const columns = boardColumns(checklist).map((column) => ({ id: column.status.id, ...column }));
  const statuses = columns.map((column) => column.status);

  return (
    <div className="-mx-5 overflow-x-auto lg:-mx-6">
      <KanbanGrid
        columns={columns}
        renderColumn={({ status, items }) => (
          <KanbanColumnFrame
            title={status.label}
            color={statusColor(status)}
            count={items.length}
            isEmpty={items.length === 0}
          >
            {items.map((item) => (
              <KanbanCardShell key={item.id} status={item.status}>
                <KanbanCardFace
                  item={item}
                  checklist={checklist}
                  head={<KanbanCardHead item={item} statuses={statuses} />}
                />
              </KanbanCardShell>
            ))}
          </KanbanColumnFrame>
        )}
      />
    </div>
  );
};
