import { NextResponse } from "next/server";
import { z } from "zod";
import { agentTasks } from "@/app/_server/actions/kanban/agent-tasks";
import { defineRoute, refuse } from "@/app/_server/api/define-route";
import { ApiTag, HttpMethod } from "@/app/_server/api/contract";
import { ERRORS, page, totalField } from "@/app/_schemas/api/common";
import { agentTaskSchema, agentTasksQuery } from "@/app/_schemas/api/agents";
import { normalAgent } from "@/app/_consts/agents";

export const dynamic = "force-dynamic";

const _statusList = (raw?: string): string[] =>
  (raw ?? "").split(",").map((status) => status.trim()).filter(Boolean);

export const GET = defineRoute(
  {
    id: "listAgentTasks",
    method: HttpMethod.GET,
    path: "/agents/tasks",
    tag: ApiTag.KANBAN,
    summary: "List cards that have a virtual agent",
    description: "Cards and subtasks with an agent, across every board the API key owner can see, their own and the ones shared with them. Finished and archived cards are left out unless includeCompleted is true, which brings back finished ones. Filter by agent, board and status, and page with limit and offset.",
    query: agentTasksQuery,
    responses: {
      200: { description: "Agent cards", schema: z.object({ tasks: z.array(agentTaskSchema), total: totalField }) },
      400: ERRORS[400],
      401: ERRORS[401],
      500: ERRORS[500],
    },
  },
  async ({ user, query }) => {
    const result = await agentTasks(user.username, {
      agent: normalAgent(query.agent) || undefined,
      boardId: query.boardId,
      statuses: _statusList(query.status),
      includeCompleted: query.includeCompleted,
    });
    if (!result.success || !result.data) {
      return refuse(result.error || "Failed to list agent tasks", 500);
    }

    return NextResponse.json({ tasks: page(result.data, query), total: result.data.length });
  },
);
