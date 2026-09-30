"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Checklist, Item } from "@/app/_types";
import { BoardAgents } from "@/app/_types/agents";
import { assignKanbanAgent, getBoardAgents } from "@/app/_server/actions/kanban";
import { useToast } from "@/app/_providers/ToastProvider";
import { findItem } from "@/app/_utils/item-tree-utils";
import {
  AGENT_NOT_INDEXED,
  INVALID_AGENT,
  NO_SPEC,
  SPEC_ENCRYPTED,
  SPEC_MISSING,
} from "@/app/_consts/agents";

const REFUSAL_KEYS: Record<string, string> = {
  [INVALID_AGENT]: "kanban.agentInvalid",
  [NO_SPEC]: "kanban.agentNoSpec",
  [SPEC_MISSING]: "kanban.agentSpecMissing",
  [SPEC_ENCRYPTED]: "kanban.agentSpecEncrypted",
  [AGENT_NOT_INDEXED]: "kanban.agentNotIndexed",
};

interface UseBoardAgentsProps {
  checklist: Checklist;
  item: Item;
  isOpen: boolean;
  onUpdate: (updatedChecklist: Checklist) => void;
  onItemChange: (item: Item) => void;
}

export const useBoardAgents = ({
  checklist,
  item,
  isOpen,
  onUpdate,
  onItemChange,
}: UseBoardAgentsProps) => {
  const t = useTranslations();
  const { showToast } = useToast();
  const [roster, setRoster] = useState<BoardAgents | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !checklist.uuid) return;

    let live = true;
    setIsLoading(true);

    getBoardAgents(checklist.uuid)
      .then((result) => {
        if (live) setRoster(result.success && result.data ? result.data : null);
      })
      .catch((error) => console.error("Failed to load board agents:", error))
      .finally(() => {
        if (live) setIsLoading(false);
      });

    return () => {
      live = false;
    };
  }, [isOpen, checklist.uuid, checklist.specNote]);

  const assign = useCallback(
    async (agent: string) => {
      setIsSaving(true);

      try {
        const formData = new FormData();
        formData.append("uuid", checklist.uuid);
        formData.append("itemId", item.id);
        formData.append("agent", agent);

        const result = await assignKanbanAgent(formData);

        if (!result.success || !result.data) {
          showToast({
            type: "error",
            title: t("common.error"),
            message: t(REFUSAL_KEYS[result.error || ""] || "kanban.agentAssignFailed"),
          });
          return;
        }

        onUpdate(result.data);
        const updated = findItem(result.data.items, item.id);
        if (updated) onItemChange(updated);
      } catch (error) {
        console.error("Failed to set the card agent:", error);
        showToast({ type: "error", title: t("common.error"), message: t("kanban.agentAssignFailed") });
      } finally {
        setIsSaving(false);
      }
    },
    [checklist.uuid, item.id, onUpdate, onItemChange, showToast, t],
  );

  return { roster, isLoading, isSaving, assign };
};
