import { z } from "zod";
import { apiNames } from "@/app/_schemas/api/names";
import { isUuid } from "@/app/_consts/identity";
import { SpecStatus } from "@/app/_consts/agents";
import { envelope, pageFields, timestamp } from "./common";
import { statusChangeSchema } from "./items";
import { cardChangedSchema } from "./kanban";

const specStatusSchema = z
  .enum(SpecStatus)
  .describe("linked, none when the board has no spec, missing when it is gone or you can't read it, encrypted when it can't be used");

const agentRoleSchema = z
  .object({
    id: z.string().describe("Agent id, lowercase"),
    role: z.string().describe("The rest of the agent's line in the spec's Agents section"),
  })
  .register(apiNames, { id: "SpecAgent" });

export const cardAgentBody = z.object({
  agent: z
    .string()
    .nullish()
    .describe("Agent id, 1-64 lowercase letters, digits, dots, dashes or underscores. Empty, null or missing clears it"),
});

export const agentChangedSchema = cardChangedSchema.extend({
  warning: z
    .string()
    .optional()
    .describe("Set when the agent isn't in the spec's Agents section or the card's task line names another agent"),
});

export const boardSpecBody = z.object({
  noteId: z
    .string()
    .nullish()
    .describe("Uuid of the note to pin as the spec. Empty, null or missing unpins it"),
});

export const pinnedSpecSchema = envelope(
  z
    .object({
      boardId: z.string(),
      specNote: z.string().nullable(),
      status: specStatusSchema,
      agents: z.array(agentRoleSchema),
    })
    .register(apiNames, { id: "BoardSpec" }),
);

const contextChildSchema = z.object({
  id: z.string(),
  text: z.string(),
  status: z.string(),
  completed: z.boolean(),
  agent: z.string().optional(),
});

const contextCardSchema = z.object({
  id: z.string(),
  text: z.string(),
  description: z.string().optional(),
  status: z.string(),
  statusLabel: z.string(),
  completed: z.boolean(),
  agent: z.string().optional(),
  assignee: z.string().optional().describe("Human assignee, a username"),
  priority: z.string().optional(),
  score: z.number().optional(),
  targetDate: z.string().optional(),
  parentId: z.string().optional(),
  children: z.array(contextChildSchema).describe("Subtasks, at most 25"),
  history: z.array(statusChangeSchema).describe("The last 5 status changes"),
  lastModifiedBy: z.string().optional(),
  lastModifiedAt: timestamp.optional(),
});

const contextAgentSchema = z.object({
  id: z.string(),
  indexed: z.boolean().describe("Whether the spec note's Agents section lists this agent"),
  role: z.string().optional(),
  openTasks: z
    .array(z.object({ itemId: z.string(), text: z.string(), status: z.string() }))
    .describe("Other unfinished cards on this board with the same agent, at most 25"),
});

const contextSpecSchema = z.object({
  status: specStatusSchema,
  note: z
    .object({
      id: z.string(),
      title: z.string(),
      category: z.string(),
      owner: z.string().optional(),
      updatedAt: timestamp,
      contentLength: z.number(),
    })
    .optional(),
  goal: z.string().optional(),
  acceptance: z.string().optional(),
  decisions: z.string().optional(),
  references: z.string().optional(),
  agents: z.array(agentRoleSchema),
  task: z
    .object({
      line: z.string(),
      dependsOn: z.array(z.string()),
      agent: z.string().optional(),
      agentMatches: z
        .boolean()
        .optional()
        .describe("Whether the card's agent is the one this task line names. False means the card or the spec needs updating"),
    })
    .optional()
    .describe("This card's line in the Tasks section"),
  progress: z.array(z.string()).describe("Progress entries mentioning this card or its agent, the last 10"),
  blockers: z.array(z.string()).describe("Blockers entries mentioning this card or its agent, the last 10"),
  handover: z.array(z.string()).describe("Handover entries mentioning this card or its agent, the last 10"),
  truncated: z.boolean().describe("Something was cut to keep the answer small. Read the spec note for all of it"),
});

export const taskContextSchema = envelope(
  z
    .object({
      board: z.object({
        id: z.string(),
        title: z.string(),
        category: z.string(),
        owner: z.string().optional(),
        statuses: z.array(
          z.object({ id: z.string(), label: z.string(), order: z.number(), count: z.number() }),
        ),
        specNote: z.string().nullable(),
      }),
      card: contextCardSchema,
      agent: contextAgentSchema.nullable(),
      dependencies: z.array(
        z.object({
          itemId: z.string(),
          found: z.boolean(),
          text: z.string().optional(),
          status: z.string().optional(),
          completed: z.boolean().optional(),
        }),
      ),
      spec: contextSpecSchema,
    })
    .register(apiNames, { id: "TaskContext" }),
);

export const agentTaskSchema = z
  .object({
    boardId: z.string(),
    boardTitle: z.string(),
    specNote: z.string().nullable(),
    itemId: z.string(),
    parentId: z.string().optional(),
    text: z.string(),
    status: z.string(),
    statusLabel: z.string(),
    completed: z.boolean(),
    agent: z.string(),
    assignee: z.string().optional(),
    priority: z.string().optional(),
    lastModifiedAt: timestamp.optional(),
  })
  .register(apiNames, { id: "AgentTask" });

export const agentTasksQuery = z.object({
  agent: z.string().optional().describe("Only cards with this agent id"),
  boardId: z
    .string()
    .refine(isUuid, "boardId must be a board uuid")
    .optional()
    .describe("Only cards on this board"),
  status: z.string().optional().describe("Comma separated status ids"),
  includeCompleted: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true")
    .describe("Include finished cards, false by default"),
  ...pageFields,
});
