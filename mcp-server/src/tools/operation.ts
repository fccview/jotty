import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { binaryMediaOf, type JsonSchema, type Operation } from "../jotty/openapi.ts";
import { API_KEY_HEADER, JottyError } from "../jotty/client.ts";
import type { Spec } from "../jotty/spec.ts";
import { ToolErrorKind, errorResult, fromError, type ErrorHints } from "./errors.ts";
import { respond, toolResult, type MoreRows, type ToolResult } from "./result.ts";
import type { ToolContext } from "./context.ts";
import { fillPath, splitArgs, toolInput, type ArgLayout } from "./schema.ts";
import { catalogEntry, toolNameOf } from "./catalog.ts";
import { logger } from "../utils/logger.ts";
import { budgetOf, withBudget, withoutBudget } from "./budget.ts";

const LOG_NS = "tool-operation";
const SERVER_ERROR = 500;
const OFFSET = "offset";
const PAGING = new Set([OFFSET, "limit", "view"]);
const ITEM_INDEX = "{itemIndex}";

enum Verb {
  Get = "get",
  Put = "put",
  Delete = "delete",
}

const sentence = (text: string): string => (/[.!?]$/.test(text) ? text : `${text}.`);

export const describe = (op: Operation): string =>
  [op.summary, op.description, `Calls ${op.method.toUpperCase()} /api${op.path}`]
    .filter((part): part is string => Boolean(part))
    .map(sentence)
    .join(" ");

export const annotationsOf = (op: Operation): Tool["annotations"] => ({
  title: op.summary,
  readOnlyHint: op.method === Verb.Get,
  destructiveHint: op.method === Verb.Delete,
  idempotentHint: op.method === Verb.Get || op.method === Verb.Put || op.method === Verb.Delete,
  openWorldHint: false,
});

const _withDefaults = (schema: JsonSchema, defaults: Record<string, unknown> = {}): JsonSchema => ({
  ...schema,
  properties: Object.fromEntries(
    Object.entries(schema.properties ?? {}).map(([name, prop]) => [
      name,
      name in defaults ? { ...prop, default: defaults[name] } : prop,
    ]),
  ),
});

export const operationTool = (spec: Spec, op: Operation, maxChars: number): Tool => ({
  name: toolNameOf(op.operationId),
  description: describe(op),
  inputSchema: withBudget(
    _withDefaults(toolInput(spec, op).schema, catalogEntry(op.operationId)?.defaults),
    maxChars,
  ) as Tool["inputSchema"],
  annotations: annotationsOf(op),
});

const _picked = (data: unknown, field?: string): unknown => {
  if (!field || !data || typeof data !== "object" || !(field in data)) return data;
  const record = data as Record<string, unknown>;
  return {
    success: record.success,
    [field]: record[field],
    ...(record.warning !== undefined && { warning: record.warning }),
  };
};

const _omitted = (data: unknown, keys?: string[]): unknown => {
  if (!keys?.length || !data || typeof data !== "object" || Array.isArray(data)) return data;
  const strip = (row: unknown) =>
    row && typeof row === "object" && !Array.isArray(row)
      ? Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)))
      : row;
  return Object.fromEntries(
    Object.entries(data).map(([field, value]) => [field, Array.isArray(value) ? value.map(strip) : strip(value)]),
  );
};

const _moreRows = (layout: ArgLayout, offset: unknown): MoreRows => {
  if (layout.query.includes(OFFSET)) {
    const start = Number(offset) || 0;
    return (shown) => `Pass offset=${start + shown} to read the next rows, or narrow the request with a filter.`;
  }
  const filters = layout.query.filter((name) => !PAGING.has(name));
  const narrow = filters.length ? `Narrow it with ${filters.join(", ")}` : "Use a more specific operation";
  return () => `This operation doesn't page. ${narrow} to see the rest.`;
};

const _nameOf = (op: Operation, curated: boolean): string =>
  curated ? toolNameOf(op.operationId) : op.operationId;

const _hintsFor = (op: Operation, curated: boolean): ErrorHints => ({
  [ToolErrorKind.Input]: op.path.includes(ITEM_INDEX)
    ? "Call get_checklist to see each item's itemIndex."
    : curated
      ? "Check the arguments against the tool's input schema."
      : `Call discover with operationId ${op.operationId} to see what it takes.`,
  ...catalogEntry(op.operationId)?.hints,
});

const _download = (ctx: ToolContext, path: string, contentType: string): ToolResult => {
  const report = { download: `${ctx.client.baseUrl}/api${path}`, contentType, header: API_KEY_HEADER };
  return toolResult(
    `This returns a file (${contentType}), which doesn't fit through MCP. Download it from ${report.download} with the ${API_KEY_HEADER} header.`,
    report,
  );
};

export interface RunOptions {
  signal?: AbortSignal;
  curated?: boolean;
  maxChars?: number;
}

export const runOperation = async (
  ctx: ToolContext,
  spec: Spec,
  op: Operation,
  given: Record<string, unknown>,
  { signal, curated = false, maxChars }: RunOptions = {},
): Promise<ToolResult> => {
  const budget = maxChars ?? budgetOf(given, ctx.config.output.maxTextChars);
  const args = withoutBudget(given);
  const { schema, layout } = toolInput(spec, op);
  const entry = curated ? catalogEntry(op.operationId) : undefined;
  const known = Object.keys(schema.properties ?? {});
  const unknown = Object.keys(args).filter((name) => !known.includes(name));
  if (unknown.length) {
    return errorResult(
      ToolErrorKind.Input,
      `Unknown argument ${unknown.join(", ")}.`,
      known.length ? `${_nameOf(op, curated)} takes: ${known.join(", ")}.` : `${_nameOf(op, curated)} takes no arguments.`,
    );
  }
  const missing = layout.path.filter((name) => args[name] === undefined || args[name] === "");
  if (missing.length) {
    return errorResult(ToolErrorKind.Input, `Missing ${missing.join(", ")}.`, `Pass ${missing.join(" and ")}. List or search first if you don't have the id.`);
  }
  const defaults = Object.fromEntries(
    Object.entries(entry?.defaults ?? {}).filter(([name]) => known.includes(name)),
  );
  const merged = { ...defaults, ...args };
  const parts = splitArgs(layout, merged);
  const path = fillPath(op.path, parts.path);
  const binary = binaryMediaOf(op);
  if (binary) return _download(ctx, path, binary);
  try {
    const response = await ctx.client.send({ method: op.method, path, query: parts.query, body: parts.body, signal });
    const data = _omitted(_picked(response.data, entry?.pick), entry?.omit);
    return respond(data, budget, _moreRows(layout, merged[OFFSET]));
  } catch (err) {
    const refused = err instanceof JottyError && err.status < SERVER_ERROR;
    (refused ? logger.debug : logger.warn)(LOG_NS, `${op.operationId} failed`, err);
    return fromError(err, _hintsFor(op, curated));
  }
};
