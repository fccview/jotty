"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown01Icon, UserIcon } from "hugeicons-react";
import { Checklist, Item } from "@/app/_types";
import { AssigneeKinds, AssigneePick, BoardPerson } from "@/app/_types/kanban-assignee";
import { cn } from "@/app/_utils/global-utils";
import { avatarSeed } from "@/app/_utils/agent-avatar-utils";
import { AssigneeOption, assigneeChoices } from "@/app/_utils/kanban/assignee-options";
import { UserAvatar } from "@/app/_components/GlobalComponents/User/UserAvatar";
import {
  AgentAvatar,
  AgentAvatarSizes,
} from "@/app/_components/GlobalComponents/Agent/AgentAvatar";
import { AgentChip } from "./AgentChip";

interface KanbanAssigneePickerProps {
  checklist: Checklist;
  item: Item;
  people: BoardPerson[];
  canShare: boolean;
  disabled?: boolean;
  onPick: (pick: AssigneePick) => void;
}

export const KanbanAssigneePicker = ({
  checklist,
  item,
  people,
  canShare,
  disabled,
  onPick,
}: KanbanAssigneePickerProps) => {
  const t = useTranslations();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const { options, invalidAgent } = useMemo(
    () => assigneeChoices(people, query, canShare),
    [people, query, canShare],
  );
  const usable = options.filter((option) => !option.disabled);

  useEffect(() => {
    if (!isOpen) return;
    const _close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", _close);
    return () => document.removeEventListener("mousedown", _close);
  }, [isOpen]);

  useEffect(() => setActive(0), [query]);

  const _open = () => {
    if (disabled) return;
    setQuery("");
    setIsOpen(true);
  };

  const _choose = (option: AssigneeOption) => {
    if (option.disabled) return;
    setIsOpen(false);
    onPick(option.pick);
  };

  const _onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const moves: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };
    if (event.key in moves && usable.length) {
      event.preventDefault();
      setActive((current) => (current + moves[event.key] + usable.length) % usable.length);
    } else if (event.key === "Enter" && usable[active]) {
      event.preventDefault();
      _choose(usable[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
    }
  };

  const _hintOf = (person?: BoardPerson) => {
    if (!person || person.hasAccess) return null;
    return t(canShare ? "kanban.assigneeWillShare" : "kanban.assigneeNoAccess");
  };

  const _labelOf = ({ pick, person }: AssigneeOption) => {
    if (pick.kind === AssigneeKinds.AGENT) {
      return (
        <>
          <AgentAvatar
            agentId={pick.name}
            seed={avatarSeed(pick.name, checklist.uuid, checklist.specNote)}
            size={AgentAvatarSizes.XS}
          />
          <span className="truncate">{t("kanban.assignAgentAs", { agent: pick.name })}</span>
        </>
      );
    }
    if (pick.kind === AssigneeKinds.USER) {
      return (
        <>
          <UserAvatar username={pick.name} avatarUrl={person?.avatarUrl} size="xs" />
          <span className="truncate">{pick.name}</span>
        </>
      );
    }
    return (
      <>
        <UserIcon className="h-4 w-4" />
        <span className="text-muted-foreground">{t("kanban.unassigned")}</span>
      </>
    );
  };

  const current = (
    <span className="flex min-w-0 flex-wrap items-center gap-2 text-md lg:text-sm font-medium">
      {item.assignee && (
        <span className="flex items-center gap-2">
          <UserAvatar username={item.assignee} size="xs" />
          {item.assignee}
        </span>
      )}
      {item.agent && <AgentChip agentId={item.agent} checklist={checklist} />}
      {!item.assignee && !item.agent && (
        <span className="flex items-center gap-2 text-muted-foreground">
          <UserIcon className="h-4 w-4" />
          {t("kanban.unassigned")}
        </span>
      )}
    </span>
  );

  return (
    <div ref={rootRef} className="jotty-assignee-picker relative">
      {isOpen ? (
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={_onKeyDown}
          placeholder={t("kanban.assigneeSearch")}
          className="w-full p-3 text-md lg:text-sm bg-background border border-ring rounded-jotty focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={_open}
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between gap-2 p-3 rounded-jotty border border-border transition-colors",
            disabled ? "bg-muted text-muted-foreground cursor-not-allowed" : "hover:bg-muted/50",
          )}
        >
          {current}
          <ArrowDown01Icon className="h-4 w-4 flex-shrink-0" />
        </button>
      )}

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-jotty shadow-lg max-h-60 overflow-y-auto">
          {options.map((option) => {
            const hint = _hintOf(option.person);
            const isActive = usable[active] === option;

            return (
              <button
                key={`${option.pick.kind}:${option.pick.name}`}
                type="button"
                disabled={option.disabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => _choose(option)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left text-md lg:text-sm transition-colors",
                  option.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50",
                  isActive && "bg-muted/50",
                )}
              >
                {_labelOf(option)}
                {hint && <span className="ml-auto text-xs text-muted-foreground">{hint}</span>}
              </button>
            );
          })}
          {invalidAgent && (
            <p className="px-3 py-2 text-xs text-muted-foreground">{t("kanban.agentInvalid")}</p>
          )}
        </div>
      )}
    </div>
  );
};
