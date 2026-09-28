import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { JottyError } from "../jotty/client.ts";
import { SpecMissingError, type Spec } from "../jotty/spec.ts";
import { logger } from "../utils/logger.ts";
import { CURATED_OPERATIONS, toolNameOf } from "./catalog.ts";
import { BuiltinTool, type ToolContext } from "./context.ts";
import { ToolErrorKind, errorResult, fromError } from "./errors.ts";
import { runOperation } from "./operation.ts";
import { respond, toolResult, type ToolResult } from "./result.ts";
import { toolInput } from "./schema.ts";

const LOG_NS = "tool-builtin";
const HEALTH_PATH = "/health";
const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;
const PLUMBING_TAG = "System";

export const BUILTIN_TOOLS: Tool[] = [
  {
    name: BuiltinTool.Discover,
    description:
      "List the Jotty API operations the dedicated tools don't cover, with their operationId, method, path and summary, plus which dedicated tools are available. Pass operationId to get any operation's input schema for call_operation.",
    inputSchema: {
      type: "object",
      properties: {
        tag: { type: "string", description: "Only operations in this group, e.g. Kanban or Tasks" },
        operationId: { type: "string", description: "Return the full input schema for this one operation" },
      },
    },
    annotations: { title: "Discover the Jotty API", ...READ_ONLY },
  },
  {
    name: BuiltinTool.CallOperation,
    description:
      "Call any Jotty API operation by operationId, for things the dedicated tools don't cover (tasks, statuses, reminders, exports, logs). Use discover first to find the operationId and its arguments.",
    inputSchema: {
      type: "object",
      properties: {
        operationId: { type: "string", description: "From discover" },
        arguments: { type: "object", description: "Path, query and body fields as discover describes them" },
      },
      required: ["operationId"],
    },
    annotations: { title: "Call a Jotty API operation", destructiveHint: true, openWorldHint: false },
  },
  {
    name: BuiltinTool.Health,
    description: "Check that Jotty is reachable, which version it runs, and whether the API key works.",
    inputSchema: { type: "object", properties: {} },
    annotations: { title: "Jotty health", ...READ_ONLY },
  },
];

const _summaryOf = (spec: Spec) =>
  [...spec.operations.values()]
    .filter((op) => op.tags?.[0] !== PLUMBING_TAG && !CURATED_OPERATIONS.includes(op.operationId))
    .map((op) => ({
      operationId: op.operationId,
      method: op.method.toUpperCase(),
      path: `/api${op.path}`,
      summary: op.summary,
      tag: op.tags?.[0],
      ...(op.deprecated ? { deprecated: true } : {}),
    }));

const _discover = (ctx: ToolContext, spec: Spec, args: Record<string, unknown>): ToolResult => {
  const limit = ctx.config.output.maxTextChars;
  if (typeof args.operationId === "string") {
    const op = spec.operations.get(args.operationId);
    if (!op) {
      return errorResult(ToolErrorKind.NotFound, `No operation called ${args.operationId}.`, "Call discover without arguments to list them.");
    }
    return respond({ operationId: op.operationId, summary: op.summary, description: op.description, inputSchema: toolInput(spec, op).schema }, limit);
  }

  const operations = _summaryOf(spec).filter((op) => !args.tag || op.tag === args.tag);
  if (args.tag) return respond({ version: spec.version, operations }, limit);

  const tools = CURATED_OPERATIONS.filter((id) => spec.operations.has(id)).map(toolNameOf);
  const unavailableTools = CURATED_OPERATIONS.filter((id) => !spec.operations.has(id)).map(toolNameOf);
  return respond({ version: spec.version, tools, unavailableTools, operations }, limit);
};

const _call = (ctx: ToolContext, spec: Spec, args: Record<string, unknown>, signal?: AbortSignal) => {
  const op = typeof args.operationId === "string" ? spec.operations.get(args.operationId) : undefined;
  if (!op) {
    return Promise.resolve(
      errorResult(ToolErrorKind.NotFound, `Unknown operationId ${String(args.operationId)}.`, "Use discover to list valid operationIds."),
    );
  }
  const inner = args.arguments && typeof args.arguments === "object" ? (args.arguments as Record<string, unknown>) : {};
  return runOperation(ctx, spec, op, inner, { signal });
};

const REJECTED = new Set([401, 403]);

const _keyStatus = (ctx: ToolContext, spec: Spec | null, problem: unknown): string => {
  if (!ctx.client.hasApiKey) return "missing";
  if (spec) return "accepted";
  return problem instanceof JottyError && REJECTED.has(problem.status) ? "rejected" : "unchecked";
};

const _health = async (ctx: ToolContext, signal?: AbortSignal): Promise<ToolResult> => {
  try {
    const health = await ctx.client.send({ method: "get", path: HEALTH_PATH, signal });
    let spec: Spec | null = null;
    let problem: unknown = null;
    try {
      spec = await ctx.specs.load(ctx.client, signal);
    } catch (err) {
      logger.warn(LOG_NS, "spec unavailable during health check", err);
      problem = err;
    }
    const report = {
      jotty: ctx.client.baseUrl,
      upstream: health.data,
      apiKey: _keyStatus(ctx, spec, problem),
      operations: spec?.operations.size ?? 0,
      uptimeSec: Math.round((Date.now() - ctx.startedAt) / 1000),
      ...(problem instanceof SpecMissingError && { problem: problem.message }),
    };
    const summary = `Jotty at ${report.jotty} is up, API key ${report.apiKey}.`;
    return toolResult(report.problem ? `${summary} ${report.problem}` : summary, report);
  } catch (err) {
    return fromError(err);
  }
};

export const runBuiltin = async (
  ctx: ToolContext,
  name: BuiltinTool,
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ToolResult> => {
  if (name === BuiltinTool.Health) return _health(ctx, signal);
  try {
    const spec = await ctx.specs.load(ctx.client, signal);
    return name === BuiltinTool.Discover ? _discover(ctx, spec, args) : await _call(ctx, spec, args, signal);
  } catch (err) {
    logger.warn(LOG_NS, `${name} could not load the API spec`, err);
    return fromError(err);
  }
};
