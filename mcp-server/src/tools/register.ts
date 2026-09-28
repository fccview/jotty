import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema, type Tool } from "@modelcontextprotocol/sdk/types.js";
import type { Spec } from "../jotty/spec.ts";
import { logger } from "../utils/logger.ts";
import { builtinTools, runBuiltin } from "./builtins.ts";
import { CURATED_OPERATIONS, toolNameOf } from "./catalog.ts";
import { BuiltinTool, type ToolContext } from "./context.ts";
import { ToolErrorKind, errorResult } from "./errors.ts";
import { operationTool, runOperation } from "./operation.ts";

const LOG_NS = "tools";

const isBuiltin = (name: string): name is BuiltinTool =>
  Object.values(BuiltinTool).some((tool) => tool === name);

const _curated = (spec: Spec) =>
  CURATED_OPERATIONS.flatMap((id) => {
    const op = spec.operations.get(id);
    return op ? [op] : [];
  });

const _loadSpec = (ctx: ToolContext, signal?: AbortSignal): Promise<Spec | null> =>
  ctx.specs.load(ctx.client, signal).catch((err: unknown) => {
    logger.warn(LOG_NS, "could not load the Jotty API spec, only built-in tools are listed", err);
    return null;
  });

export const registerTools = (server: Server, ctx: ToolContext): void => {
  server.setRequestHandler(ListToolsRequestSchema, async (_request, extra) => {
    const spec = await _loadSpec(ctx, extra.signal);
    const maxChars = ctx.config.output.maxTextChars;
    const tools: Tool[] = spec ? _curated(spec).map((op) => operationTool(spec, op, maxChars)) : [];
    return { tools: [...tools, ...builtinTools(maxChars)] };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name } = request.params;
    const args = request.params.arguments ?? {};
    if (isBuiltin(name)) return runBuiltin(ctx, name, args, extra.signal);

    const spec = await _loadSpec(ctx, extra.signal);
    const op = spec && _curated(spec).find((candidate) => toolNameOf(candidate.operationId) === name);
    if (!spec || !op) {
      return errorResult(ToolErrorKind.Unsupported, `This Jotty instance has no ${name} tool.`, "Use discover to see what it offers.");
    }
    return runOperation(ctx, spec, op, args, { signal: extra.signal, curated: true });
  });
};
