import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Build a successful tool result containing pretty-printed JSON.
 *
 * Accepts either a raw value or a Promise (e.g. a `JottyClient` call) so the
 * common pattern `run(() => json(client.get(...)))` awaits the network request
 * before serialising. Most Jotty endpoints return JSON, so this is the common
 * happy path.
 */
export async function json(data: Promise<unknown> | unknown): Promise<CallToolResult> {
  const resolved = await data;
  return {
    content: [{ type: "text", text: JSON.stringify(resolved, null, 2) }],
  };
}

/** Build a successful tool result with plain text. */
export function text(value: string): CallToolResult {
  return {
    content: [{ type: "text", text: value }],
  };
}

/**
 * Build an error tool result. Jotty API errors (bad UUID, missing title, 403,
 * etc.) are surfaced to the model as `isError: true` so the client can react,
 * rather than crashing the server.
 */
export function fail(message: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

/**
 * Run an async handler and convert thrown `JottyApiError`s into structured
 * MCP error results. Keeps every tool callback free of repetitive try/catch.
 */
export async function run(
  fn: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Error) {
      return fail(err.message);
    }
    return fail(String(err));
  }
}