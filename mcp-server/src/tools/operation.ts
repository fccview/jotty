import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { Operation } from "../jotty/openapi.ts";
import type { Spec } from "../jotty/spec.ts";
import { ToolErrorKind, errorResult, fromError } from "./errors.ts";
import { asRecord, render, toolResult, type ToolResult } from "./result.ts";
import type { ToolContext } from "./context.ts";
import { fillPath, splitArgs, toolInput } from "./schema.ts";
import { toolNameOf } from "./catalog.ts";
import { logger } from "../utils/logger.ts";

const LOG_NS = "tool-operation";

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

export const operationTool = (spec: Spec, op: Operation): Tool => ({
  name: toolNameOf(op.operationId),
  description: describe(op),
  inputSchema: toolInput(spec, op).schema as Tool["inputSchema"],
  annotations: annotationsOf(op),
});

export const runOperation = async (
  ctx: ToolContext,
  spec: Spec,
  op: Operation,
  args: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ToolResult> => {
  const { layout } = toolInput(spec, op);
  const missing = layout.path.filter((name) => args[name] === undefined || args[name] === "");
  if (missing.length) {
    return errorResult(ToolErrorKind.Input, `Missing ${missing.join(", ")}.`, "List first to get a valid id.");
  }
  try {
    const parts = splitArgs(layout, args);
    const response = await ctx.client.send({
      method: op.method,
      path: fillPath(op.path, parts.path),
      query: parts.query,
      body: parts.body,
      signal,
    });
    return toolResult(render(response.data, ctx.config.output.maxTextChars), asRecord(response.data));
  } catch (err) {
    logger.warn(LOG_NS, `${op.operationId} failed`, err);
    return fromError(err);
  }
};
