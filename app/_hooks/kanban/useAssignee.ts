"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Checklist, Result } from "@/app/_types";
import { Modes } from "@/app/_types/enums";
import { AssigneeKinds, AssigneePick, BoardPerson } from "@/app/_types/kanban-assignee";
import { shareItem } from "@/app/_server/actions/share/operations";
import { useToast } from "@/app/_providers/ToastProvider";

const EDITOR_GRANT = { canRead: true, canEdit: true, canDelete: false };

const FIELDS_FOR: Record<AssigneeKinds, (name: string) => Record<string, string>> = {
  [AssigneeKinds.NONE]: () => ({ assignee: "", agent: "" }),
  [AssigneeKinds.USER]: (name) => ({ assignee: name, agent: "" }),
  [AssigneeKinds.AGENT]: (name) => ({ assignee: "", agent: name }),
};

interface UseAssigneeProps {
  uuid: string;
  people: BoardPerson[];
  save: (fields: Record<string, string>) => Promise<Result<Checklist> | undefined>;
  onShared: () => Promise<void>;
}

export const useAssignee = ({ uuid, people, save, onShared }: UseAssigneeProps) => {
  const t = useTranslations();
  const { showToast } = useToast();
  const [pendingShare, setPendingShare] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const _fail = (message?: string) =>
    showToast({ type: "error", title: t("common.error"), message: message || t("kanban.assignFailed") });

  const _run = async (work: () => Promise<void>) => {
    setIsSaving(true);
    try {
      await work();
    } catch (error) {
      console.error("Failed to change the assignee:", error);
      _fail();
    } finally {
      setIsSaving(false);
    }
  };

  const _save = async ({ kind, name }: AssigneePick) => {
    const result = await save(FIELDS_FOR[kind](name));
    if (result && !result.success) _fail(result.error);
  };

  const pick = (choice: AssigneePick) => {
    const person = people.find((candidate) => candidate.username === choice.name);
    if (choice.kind === AssigneeKinds.USER && person && !person.hasAccess) {
      setPendingShare(choice.name);
      return;
    }
    _run(() => _save(choice));
  };

  const confirmShare = () => {
    const username = pendingShare;
    setPendingShare(null);
    if (!username) return;

    _run(async () => {
      const shared = await shareItem(Modes.CHECKLISTS, uuid, username, EDITOR_GRANT);
      if (!shared.success) return _fail(shared.error);

      await onShared();
      await _save({ kind: AssigneeKinds.USER, name: username });
    });
  };

  return { pick, pendingShare, confirmShare, cancelShare: () => setPendingShare(null), isSaving };
};
