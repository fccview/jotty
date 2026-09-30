import { Checklist, KanbanStatus } from "@/app/_types";
import {
  ContextAgent,
  ContextCard,
  ContextDependency,
  ContextStatus,
  TaskContext,
} from "@/app/_types/agents";
import { CARDS_MAX, HISTORY_MAX, SECTION_MAX_CHARS, SpecSections } from "@/app/_consts/agents";
import { DEFAULT_KANBAN_STATUSES } from "@/app/_consts/kanban";
import { UNCATEGORIZED } from "@/app/_consts/notes";
import {
  CardSpot,
  cardStatus,
  flatCards,
  isCardDone,
  plainDescription,
  statusLabel,
} from "@/app/_utils/kanban/card-tree";
import { Snipper, snipper } from "@/app/_utils/spec/bounds";
import { SpecTask, specTasks, taskFor } from "@/app/_utils/spec/roster";
import { SpecRead, readSpec } from "./spec";
import { specView } from "./context-spec";

const _statusesOf = (board: Checklist, statuses: KanbanStatus[]): ContextStatus[] => {
  const live = board.items.filter((item) => !item.isArchived);

  return [...statuses]
    .sort((a, b) => a.order - b.order)
    .map(({ id, label, order }) => ({
      id,
      label,
      order,
      count: live.filter((item) => cardStatus(item) === id).length,
    }));
};

const _cardOf = ({ item, parentId }: CardSpot, statuses: KanbanStatus[], snip: Snipper): ContextCard => {
  const status = cardStatus(item);
  const children = (item.children || []).filter((child) => !child.isArchived);

  return {
    id: item.id,
    text: item.text,
    ...(item.description && {
      description: snip.text(plainDescription(item.description), SECTION_MAX_CHARS),
    }),
    status,
    statusLabel: statusLabel(statuses, status),
    completed: isCardDone(item),
    ...(item.agent && { agent: item.agent }),
    ...(item.assignee && { assignee: item.assignee }),
    ...(item.priority && { priority: item.priority }),
    ...(item.score !== undefined && { score: item.score }),
    ...(item.targetDate && { targetDate: item.targetDate }),
    ...(parentId && { parentId }),
    children: snip.rows(children, CARDS_MAX).map((child) => ({
      id: child.id,
      text: child.text,
      status: cardStatus(child),
      completed: isCardDone(child),
      ...(child.agent && { agent: child.agent }),
    })),
    history: (item.history || []).slice(-HISTORY_MAX),
    ...(item.lastModifiedBy && { lastModifiedBy: item.lastModifiedBy }),
    ...(item.lastModifiedAt && { lastModifiedAt: item.lastModifiedAt }),
  };
};

const _agentOf = (
  spot: CardSpot,
  cards: CardSpot[],
  spec: SpecRead,
  snip: Snipper,
): ContextAgent | null => {
  const agent = spot.item.agent;
  if (!agent) return null;

  const indexed = spec.agents.find((known) => known.id === agent);
  const open = cards.filter(
    ({ item }) =>
      item.id !== spot.item.id && item.agent === agent && !item.isArchived && !isCardDone(item),
  );

  return {
    id: agent,
    indexed: !!indexed,
    ...(indexed?.role && { role: indexed.role }),
    openTasks: snip.rows(open, CARDS_MAX).map(({ item }) => ({
      itemId: item.id,
      text: item.text,
      status: cardStatus(item),
    })),
  };
};

const _dependenciesOf = (task: SpecTask | undefined, cards: CardSpot[]): ContextDependency[] =>
  (task?.dependsOn || []).slice(0, CARDS_MAX).map((itemId) => {
    const hit = cards.find(({ item }) => item.id === itemId)?.item;
    if (!hit) return { itemId, found: false };

    return { itemId, found: true, text: hit.text, status: cardStatus(hit), completed: isCardDone(hit) };
  });

export const taskContext = async (
  username: string,
  board: Checklist,
  itemId: string,
): Promise<TaskContext | null> => {
  const cards = flatCards(board.items);
  const spot = cards.find(({ item }) => item.id === itemId);
  if (!spot) return null;

  const snip = snipper();
  const statuses = board.statuses || DEFAULT_KANBAN_STATUSES;
  const spec = await readSpec(board.specNote, username);
  const task = taskFor(specTasks(spec.sections[SpecSections.TASKS]), itemId);

  const card = _cardOf(spot, statuses, snip);
  const agent = _agentOf(spot, cards, spec, snip);
  const specPart = specView(spec, spot.item, task, snip);

  return {
    board: {
      id: board.uuid,
      title: board.title,
      category: board.category || UNCATEGORIZED,
      ...(board.owner && { owner: board.owner }),
      statuses: _statusesOf(board, statuses),
      specNote: board.specNote ?? null,
    },
    card,
    agent,
    dependencies: _dependenciesOf(task, cards),
    spec: { ...specPart, truncated: snip.wasCut() },
  };
};
