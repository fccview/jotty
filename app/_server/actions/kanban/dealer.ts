import { revalidatePath } from "next/cache";
import path from "path";
import { ensureDir, serverWriteFile } from "@/app/_server/actions/file";
import { getListById } from "@/app/_server/actions/checklist/queries";
import { reachableFile, usersWithAccess } from "@/app/_server/actions/share/queries";
import { findUserRecord } from "@/app/_server/actions/users/records";
import { broadcast } from "@/app/_server/actions/ws/broadcast";
import { notifyUser } from "@/app/_server/actions/notifications/internal";
import { assigneeRefusal } from "@/app/_server/actions/kanban/assignee";
import { rehomeRefs } from "@/app/_server/actions/attachments/adopt";
import { failedWith } from "@/app/_server/actions/lib/read-only-message";
import { itemLane, runQueued } from "@/app/_server/actions/lib/concurrency";
import { listToMarkdown } from "@/app/_utils/checklist-utils";
import { extractHashtagsFromContent, normalizeTag } from "@/app/_utils/tag-utils";
import { applyStatus, completeParent } from "@/app/_utils/item-status-utils";
import { findItem, updateItem } from "@/app/_utils/item-tree-utils";
import { flatCards } from "@/app/_utils/kanban/card-tree";
import { boardColumns, unknownStatus } from "@/app/_consts/kanban";
import { Checklist, Item, KanbanPriority, KanbanStatus, Result, SanitisedUser } from "@/app/_types";
import {
  CardPlacement,
  ItemTypes,
  Modes,
  NotificationTargets,
  PermissionTypes,
} from "@/app/_types/enums";

export interface CardDraft {
  text: string;
  status?: string;
  description?: string;
  priority?: KanbanPriority;
  score?: number;
  assignee?: string;
  externalId?: string;
}

export interface DealtCard {
  card: Item;
  updated: boolean;
}

interface Stamp {
  username: string;
  now: string;
  statuses?: KanbanStatus[];
}

interface Handoff {
  assignee: string;
  cardId: string;
}

const _fieldsOf = (draft: CardDraft, description?: string): Partial<Item> => ({
  ...(draft.text && { text: draft.text }),
  ...(description !== undefined && { description: description || undefined }),
  ...(draft.priority !== undefined && { priority: draft.priority }),
  ...(draft.score !== undefined && { score: draft.score }),
  ...(draft.assignee !== undefined && { assignee: draft.assignee || undefined }),
  ...(draft.externalId && { externalId: draft.externalId }),
});

const _reworked = (cards: Item[], id: string, fields: Partial<Item>, status: string | undefined, stamp: Stamp) => {
  const patched = updateItem(cards, id, (item) => ({
    ...item,
    ...fields,
    lastModifiedBy: stamp.username,
    lastModifiedAt: stamp.now,
  }));
  if (!status) return patched;
  const moved = applyStatus(patched, id, status, stamp.statuses, stamp.username, stamp.now);
  return completeParent(moved, id, stamp.statuses, stamp.username, stamp.now);
};

const _idMinter = (boardUuid: string, items: Item[]) => {
  const taken = new Set(flatCards(items).map(({ item }) => item.id));
  let tick = Date.now();
  return () => {
    while (taken.has(`${boardUuid}-${tick}`)) tick++;
    const id = `${boardUuid}-${tick}`;
    taken.add(id);
    return id;
  };
};

const _byExternalId = (items: Item[]) => {
  const known = new Map<string, Item>();
  flatCards(items).forEach(({ item }) => {
    if (item.externalId && !known.has(item.externalId)) known.set(item.externalId, item);
  });
  return known;
};

const _assigneeRefusal = async (drafts: CardDraft[], boardUuid: string, known: Map<string, Item>) => {
  const changed = drafts.filter(
    ({ assignee, externalId }) => assignee && assignee !== (externalId && known.get(externalId)?.assignee),
  );
  const assignees = Array.from(new Set(changed.map((draft) => draft.assignee))) as string[];
  for (const assignee of assignees) {
    const refusal = await assigneeRefusal(assignee, boardUuid);
    if (refusal) return `${refusal}: ${assignee}`;
  }
  return null;
};

const _placed = (items: Item[], fresh: Item[], bottom: boolean): Item[] => {
  if (bottom) {
    const last = items.reduce((max, item) => Math.max(max, item.order ?? 0), -1);
    return [...items, ...fresh.map((card, index) => ({ ...card, order: last + 1 + index }))];
  }
  return [
    ...fresh.map((card, index) => ({ ...card, order: index })),
    ...items.map((item) => ({ ...item, order: item.order + fresh.length })),
  ];
};

const _handOff = async (board: Checklist, handoffs: Handoff[], username: string) => {
  for (const { assignee, cardId } of handoffs) {
    try {
      await notifyUser(assignee, {
        type: "assignment",
        title: findItem(board.items, cardId)?.text || "New task assigned",
        message: `${username} assigned you to a task in "${board.title}"`,
        data: { itemId: board.uuid, itemType: NotificationTargets.CHECKLIST, taskId: cardId },
      });
    } catch (error) {
      console.warn("[kanban-dealer] assignment notification failed:", error);
    }
  }
};

const _dealCards = async (
  actor: SanitisedUser,
  boardUuid: string,
  drafts: CardDraft[],
  placement?: CardPlacement,
): Promise<Result<DealtCard[]>> => {
  const username = actor?.username;
  if (!username) return { success: false, error: "Not authenticated" };

  const filePath = await reachableFile(boardUuid, ItemTypes.CHECKLIST, username, PermissionTypes.EDIT);
  if (!filePath) return { success: false, error: "Permission denied" };

  const stored = await getListById(boardUuid, username);
  if (!stored) return { success: false, error: "List not found" };

  const columns = boardColumns(stored.statuses);
  if (drafts.some((draft) => draft.status && !columns.some((column) => column.id === draft.status))) {
    return { success: false, error: unknownStatus(stored.statuses) };
  }

  const known = _byExternalId(stored.items);
  const refusal = await _assigneeRefusal(drafts, stored.uuid, known);
  if (refusal) return { success: false, error: refusal };

  try {
    const stamp: Stamp = { username, now: new Date().toISOString(), statuses: stored.statuses };
    const sharedBoard = (await usersWithAccess(stored.uuid)).length > 0;
    const bottom = (placement ?? (await findUserRecord(username))?.newItemInsertion) === CardPlacement.BOTTOM;
    const firstColumn = [...columns].sort((a, b) => a.order - b.order)[0];
    const mintId = _idMinter(stored.uuid, stored.items);

    let items = stored.items;
    let fresh: Item[] = [];
    const freshIds = new Set<string>();
    const dealt: { id: string; updated: boolean }[] = [];
    const handoffs: Handoff[] = [];

    for (const draft of drafts) {
      const description = draft.description
        ? await rehomeRefs(stored.uuid, username, draft.description)
        : draft.description;
      const fields = _fieldsOf(draft, description);
      const match = draft.externalId ? known.get(draft.externalId) : undefined;

      const id = match ? match.id : mintId();

      if (draft.assignee && draft.assignee !== username && draft.assignee !== match?.assignee) {
        handoffs.push({ assignee: draft.assignee, cardId: id });
      }

      if (match) {
        if (freshIds.has(match.id)) fresh = _reworked(fresh, match.id, fields, draft.status, stamp);
        else items = _reworked(items, match.id, fields, draft.status, stamp);
        known.set(draft.externalId!, { ...match, ...fields });
        dealt.push({ id, updated: true });
        continue;
      }

      const status = draft.status || firstColumn.id;

      const card: Item = {
        id,
        text: draft.text,
        completed: !!columns.find((column) => column.id === status)?.autoComplete,
        order: 0,
        status,
        timeEntries: [],
        history: [{ status, timestamp: stamp.now, user: username }],
        createdBy: username,
        createdAt: stamp.now,
        ...fields,
        assignee: draft.assignee || (sharedBoard ? username : undefined),
        lastModifiedBy: username,
        lastModifiedAt: stamp.now,
      };
      fresh.push(card);
      freshIds.add(id);
      if (draft.externalId) known.set(draft.externalId, card);
      dealt.push({ id, updated: false });
    }

    const tags = Array.from(
      new Set([
        ...(stored.tags || []).map(normalizeTag),
        ...drafts.flatMap((draft) => extractHashtagsFromContent(draft.text)),
      ]),
    ).filter(Boolean);

    const board: Checklist = {
      ...stored,
      items: _placed(items, fresh, bottom),
      tags,
      updatedAt: stamp.now,
    };

    await ensureDir(path.dirname(filePath));
    await serverWriteFile(filePath, listToMarkdown(board));

    try {
      revalidatePath("/");
      revalidatePath(`/checklist/${stored.uuid}`);
    } catch (error) {
      console.warn("Cache revalidation failed, but data was saved successfully:", error);
    }

    await broadcast({ type: "checklist", action: "updated", entityId: stored.uuid, username });
    await _handOff(board, handoffs, username);

    const byId = new Map(flatCards(board.items).map(({ item }) => [item.id, item]));
    return {
      success: true,
      data: dealt.map(({ id, updated }) => ({ card: byId.get(id)!, updated })),
    };
  } catch (error) {
    console.error("Error dealing cards:", error);
    return { success: false, error: await failedWith(error, "Failed to create item") };
  }
};

export const dealCards = async (
  actor: SanitisedUser,
  boardUuid: string,
  drafts: CardDraft[],
  placement?: CardPlacement,
): Promise<Result<DealtCard[]>> =>
  runQueued(itemLane(Modes.CHECKLISTS, boardUuid), () =>
    _dealCards(actor, boardUuid, drafts, placement),
  );
