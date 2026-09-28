import { JottyError } from "../jotty/client.ts";
import { OPENAPI_SINCE, SpecMissingError } from "../jotty/spec.ts";
import { TimeoutError } from "../utils/timeout.ts";
import type { ToolResult } from "./result.ts";

export enum ToolErrorKind {
  Input = "input",
  Auth = "auth",
  Forbidden = "forbidden",
  NotFound = "not_found",
  Upstream = "upstream",
  Timeout = "timeout",
  Unsupported = "unsupported",
}

export const errorResult = (kind: ToolErrorKind, message: string, hint?: string, status?: number): ToolResult => ({
  content: [{ type: "text", text: hint ? `${message}\n${hint}` : message }],
  structuredContent: { error: { kind, message, ...(status ? { status } : {}), ...(hint ? { hint } : {}) } },
  isError: true,
});

const KIND_BY_STATUS: Record<number, ToolErrorKind> = {
  400: ToolErrorKind.Input,
  401: ToolErrorKind.Auth,
  403: ToolErrorKind.Forbidden,
  404: ToolErrorKind.NotFound,
};

const HINTS: Partial<Record<ToolErrorKind, string>> = {
  [ToolErrorKind.Input]: "Check the arguments against the tool's input schema.",
  [ToolErrorKind.Auth]: "The Jotty API key is missing or wrong. Check JOTTY_API_KEY or the x-api-key header.",
  [ToolErrorKind.Forbidden]: "The API key owner doesn't hold the permission for that action on that item.",
  [ToolErrorKind.NotFound]: "It doesn't exist or the API key owner can't see it. List or search first to get a valid id.",
  [ToolErrorKind.Timeout]: "Jotty is slow or unreachable. Try the health tool.",
  [ToolErrorKind.Upstream]: "Try the health tool to see whether Jotty is reachable.",
  [ToolErrorKind.Unsupported]: `Update Jotty to ${OPENAPI_SINCE} or newer. The health tool shows the version it runs.`,
};

export type ErrorHints = Partial<Record<ToolErrorKind, string>>;

export const fromError = (err: unknown, hints: ErrorHints = {}): ToolResult => {
  if (err instanceof TimeoutError) {
    return errorResult(ToolErrorKind.Timeout, err.message, HINTS[ToolErrorKind.Timeout]);
  }
  if (err instanceof SpecMissingError) {
    return errorResult(ToolErrorKind.Unsupported, err.message, HINTS[ToolErrorKind.Unsupported]);
  }
  if (err instanceof JottyError) {
    const kind = KIND_BY_STATUS[err.status] ?? ToolErrorKind.Upstream;
    return errorResult(kind, err.message, hints[kind] ?? HINTS[kind], err.status);
  }
  const message = err instanceof Error ? err.message : "Unexpected failure";
  return errorResult(ToolErrorKind.Upstream, message, HINTS[ToolErrorKind.Upstream]);
};
