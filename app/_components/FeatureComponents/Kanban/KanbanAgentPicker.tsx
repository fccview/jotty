"use client";

import { useTranslations } from "next-intl";
import { Checklist, Item } from "@/app/_types";
import { BoardAgents } from "@/app/_types/agents";
import { SpecStatus } from "@/app/_consts/agents";
import { Dropdown } from "@/app/_components/GlobalComponents/Dropdowns/Dropdown";
import { AgentAvatarSizes } from "@/app/_components/GlobalComponents/Agent/AgentAvatar";
import { useBoardAgents } from "@/app/_hooks/kanban/useBoardAgents";
import { AgentChip } from "./AgentChip";

interface KanbanAgentPickerProps {
  checklist: Checklist;
  item: Item;
  isOpen: boolean;
  canEdit: boolean;
  onUpdate: (updatedChecklist: Checklist) => void;
  onItemChange: (item: Item) => void;
}

const STATUS_NOTES: Partial<Record<SpecStatus, string>> = {
  [SpecStatus.NONE]: "kanban.agentNoSpec",
  [SpecStatus.MISSING]: "kanban.agentSpecMissing",
  [SpecStatus.ENCRYPTED]: "kanban.agentSpecEncrypted",
};

const _noteKey = (roster: BoardAgents | null, isLoading: boolean): string | null => {
  if (isLoading) return "kanban.agentLoading";
  if (!roster) return null;
  if (STATUS_NOTES[roster.status]) return STATUS_NOTES[roster.status] ?? null;
  return roster.agents.length ? null : "kanban.agentNoneListed";
};

export const KanbanAgentPicker = ({
  checklist,
  item,
  isOpen,
  canEdit,
  onUpdate,
  onItemChange,
}: KanbanAgentPickerProps) => {
  const t = useTranslations();
  const { roster, isLoading, isSaving, assign } = useBoardAgents({
    checklist,
    item,
    isOpen,
    onUpdate,
    onItemChange,
  });

  const current = item.agent || "";
  const listed = roster?.agents || [];
  const unlisted = current && !listed.some((agent) => agent.id === current);
  const noteKey = _noteKey(roster, isLoading);

  const options = [
    { id: "", name: <span className="text-muted-foreground">{t("kanban.agentNone")}</span> },
    ...listed.map((agent) => ({
      id: agent.id,
      name: (
        <span className="flex min-w-0 items-center gap-2">
          <AgentChip agentId={agent.id} checklist={checklist} size={AgentAvatarSizes.SM} />
          {agent.role && (
            <span className="truncate text-xs text-muted-foreground">{agent.role}</span>
          )}
        </span>
      ),
    })),
    ...(unlisted
      ? [{ id: current, name: t("kanban.agentUnlisted", { agent: current }) }]
      : []),
  ];

  return (
    <div className="space-y-2">
      {canEdit ? (
        <Dropdown
          value={current}
          options={options}
          onChange={(agent) => agent !== current && assign(agent)}
          disabled={isSaving || options.length < 2}
          placeholder={t("kanban.agentNone")}
        />
      ) : (
        <div className="text-sm">
          {current ? (
            <AgentChip agentId={current} checklist={checklist} size={AgentAvatarSizes.SM} />
          ) : (
            <span className="text-muted-foreground">{t("kanban.agentNone")}</span>
          )}
        </div>
      )}
      {noteKey && <p className="text-xs text-muted-foreground">{t(noteKey)}</p>}
      <p className="text-xs text-muted-foreground/80">{t("kanban.agentHint")}</p>
    </div>
  );
};
