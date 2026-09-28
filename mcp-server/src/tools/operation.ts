import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { binaryMediaOf, type JsonSchema, type Operation } from "../jotty/openapi.ts";
import { API_KEY_HEADER, JottyError } from "../jotty/client.ts";
import type { Spec } from "../jotty/spec.ts";
import { ToolErrorKind, errorResult, fromError } from "./errors.ts";
import { respond, toolResult, type ToolResult } from "./result.ts";
import type { ToolContext } from "./context.ts";
import { fillPath, splitArgs, toolInput } from "./schema.ts";
import { catalogEntry, toolNameOf } from "./catalog.ts";
import { logger } from "../utils/logger.ts";

const LOG_NS = "tool-operation";
const SERVER_ERROR = 500;

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

export const operationTool = (spec: Spec, op: Operation): Tool => ({
  name: toolNameOf(op.operationId),
  description: describe(op),
  inputSchema: _withDefaults(toolInput(spec, op).schema, catalogEntry(op.operationId)?.defaults) as Tool["inputSchema"],
  annotations: annotationsOf(op),
});

const _picked = (data: unknown, field?: string): unknown => {
  if (!field || !data || typeof data !== "object" || !(field in data)) return data;
  const record = data as Record<string, unknown>;
  return { success: record.success, [field]: record[field] };
};

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
}

export const runOperation = async (
  ctx: ToolContext,
  spec: Spec,
  op: Operation,
  args: Record<string, unknown>,
  { signal, curated = false }: RunOptions = {},
): Promise<ToolResult> => {
  const { schema, layout } = toolInput(spec, op);
  const entry = curated ? catalogEntry(op.operationId) : undefined;
  const known = Object.keys(schema.properties ?? {});
  const unknown = Object.keys(args).filter((name) => !known.includes(name));
  if (unknown.length) {
    return errorResult(
      ToolErrorKind.Input,
      `Unknown argument ${unknown.join(", ")}.`,
      known.length ? `${op.operationId} takes: ${known.join(", ")}.` : `${op.operationId} takes no arguments.`,
    );
  }
  const missing = layout.path.filter((name) => args[name] === undefined || args[name] === "");
  if (missing.length) {
    return errorResult(ToolErrorKind.Input, `Missing ${missing.join(", ")}.`, `Pass ${missing.join(" and ")}. List or search first if you don't have the id.`);
  }
  const defaults = Object.fromEntries(
    Object.entries(entry?.defaults ?? {}).filter(([name]) => known.includes(name)),
  );
  const parts = splitArgs(layout, { ...defaults, ...args });
  const path = fillPath(op.path, parts.path);
  const binary = binaryMediaOf(op);
  if (binary) return _download(ctx, path, binary);
  try {
    const response = await ctx.client.send({ method: op.method, path, query: parts.query, body: parts.body, signal });
    return respond(_picked(response.data, entry?.pick), ctx.config.output.maxTextChars);
  } catch (err) {
    const refused = err instanceof JottyError && err.status < SERVER_ERROR;
    (refused ? logger.debug : logger.warn)(LOG_NS, `${op.operationId} failed`, err);
    return fromError(err);
  }
};
