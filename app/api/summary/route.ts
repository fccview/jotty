import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserNotes } from "@/app/_server/actions/note/queries";
import { getUserChecklists } from "@/app/_server/actions/checklist/queries";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS } from "@/app/_schemas/api/common";
import { summaryQuery, summarySchema } from "@/app/_schemas/api/discovery";
import { Checklist, Result } from "@/app/_types";
import { ChecklistsTypes, isKanbanType, TaskStatus } from "@/app/_types/enums";
import { UNCATEGORIZED } from "@/app/_consts/notes";

export const dynamic = "force-dynamic";

const _tally = <T>(things: T[], keyOf: (thing: T) => string) =>
  things.reduce<Record<string, number>>((acc, thing) => {
    const key = keyOf(thing);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

const _rate = (done: number, total: number) =>
  total > 0 ? Math.round((done / total) * 100) : 0;

const _countItems = (lists: Checklist[]) => {
  const counts = { total: 0, completed: 0, tasks: 0, tasksDone: 0, inProgress: 0, todo: 0 };

  lists.forEach((list) => {
    counts.total += list.items.length;
    list.items.forEach((item) => {
      if (item.completed) counts.completed++;
      if (!isKanbanType(list.type) || !item.status) return;
      counts.tasks++;
      if (item.status === TaskStatus.COMPLETED) counts.tasksDone++;
      if (item.status === TaskStatus.IN_PROGRESS) counts.inProgress++;
      if (item.status === TaskStatus.TODO) counts.todo++;
    });
  });

  return counts;
};

export const GET = defineRoute(
  {
    id: "getSummary",
    method: HttpMethod.GET,
    path: "/summary",
    tag: ApiTag.DISCOVERY,
    summary: "Get usage summary",
    description: "Counts of notes, checklists, items and Kanban tasks owned by a user. Shared items are not counted. Admins can ask for anybody's.",
    query: summaryQuery,
    responses: {
      200: { description: "Summary", schema: z.object({ summary: summarySchema }) },
      401: ERRORS[401],
      403: ERRORS[403],
      500: ERRORS[500],
    },
  },
  async ({ user, query }) => {
    if (query.username && query.username !== user.username && !user.isAdmin) {
      return refuse("Only administrators can query other users' summary data", 403);
    }

    const username = query.username || user.username;

    const notesResult = await getUserNotes({ username });
    if (!notesResult.success || !notesResult.data) {
      return refuse(notesResult.error || "Failed to fetch notes", 500);
    }

    const listsResult = (await getUserChecklists({ username })) as Result<Checklist[]>;
    if (!listsResult.success || !listsResult.data) {
      return refuse(listsResult.error || "Failed to fetch checklists", 500);
    }

    const notes = notesResult.data.filter((note) => note.owner === username);
    const lists = listsResult.data.filter((list) => list.owner === username);
    const counts = _countItems(lists);

    return NextResponse.json({
      summary: {
        username,
        notes: {
          total: notes.length,
          categories: _tally(notes, (note) => note.category || UNCATEGORIZED),
        },
        checklists: {
          total: lists.length,
          categories: _tally(lists, (list) => list.category || UNCATEGORIZED),
          types: _tally(lists, (list) => list.type || ChecklistsTypes.SIMPLE),
        },
        items: {
          total: counts.total,
          completed: counts.completed,
          pending: counts.total - counts.completed,
          completionRate: _rate(counts.completed, counts.total),
        },
        tasks: {
          total: counts.tasks,
          completed: counts.tasksDone,
          inProgress: counts.inProgress,
          todo: counts.todo,
          completionRate: _rate(counts.tasksDone, counts.tasks),
        },
      },
    });
  },
);
