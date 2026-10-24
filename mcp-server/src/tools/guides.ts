import tools from "../../docs/TOOLS.md" with { type: "text" };
import agents from "../../docs/AGENTS.md" with { type: "text" };
import { ToolErrorKind, errorResult } from "./errors.ts";
import { toolResult, type ToolResult } from "./result.ts";

export enum GuideId {
  Tools = "tools",
  Agents = "agents",
}

const GUIDES: Record<GuideId, string> = {
  [GuideId.Tools]: tools,
  [GuideId.Agents]: agents,
};

const _titleOf = (text: string): string => text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";

const _isGuide = (id: unknown): id is GuideId => Object.values(GuideId).some((guide) => guide === id);

const _count = (raw: unknown, fallback: number): number =>
  typeof raw === "number" && Number.isInteger(raw) && raw >= 0 ? raw : fallback;

const _list = (): ToolResult => {
  const guides = Object.values(GuideId).map((id) => ({ id, title: _titleOf(GUIDES[id]) }));
  return toolResult(
    guides.map(({ id, title }) => `${id}: ${title}`).join("\n"),
    { guides },
  );
};

export const mcpDocs = (args: Record<string, unknown>): ToolResult => {
  if (args.docId === undefined) return _list();
  if (!_isGuide(args.docId)) {
    return errorResult(
      ToolErrorKind.NotFound,
      `No MCP guide called ${String(args.docId)}.`,
      `The MCP guides are ${Object.values(GuideId).join(" and ")}. Jotty's own guides are in jotty_docs.`,
    );
  }

  const text = GUIDES[args.docId];
  const offset = _count(args.offset, 0);
  const end = Math.min(text.length, offset + _count(args.limit, text.length));
  const nextOffset = end < text.length ? end : undefined;
  const slice = text.slice(offset, end);

  return toolResult(
    nextOffset === undefined ? slice : `${slice}\n... pass offset=${nextOffset} for the rest.`,
    { id: args.docId, contentLength: text.length, ...(nextOffset !== undefined && { nextOffset }) },
  );
};
