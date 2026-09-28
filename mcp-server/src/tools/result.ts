export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

const TRUNCATED = "\n... truncated, the full response is in structuredContent";

export const asRecord = (data: unknown): Record<string, unknown> =>
  data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : { result: data };

export const render = (data: unknown, maxChars: number): string => {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return text.length > maxChars ? `${text.slice(0, maxChars)}${TRUNCATED}` : text;
};

export const toolResult = (text: string, structured?: Record<string, unknown>): ToolResult => ({
  content: [{ type: "text", text }],
  ...(structured ? { structuredContent: structured } : {}),
});
