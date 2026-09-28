export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface Trimmed {
  field: string;
  shown: number;
  of: number;
  hint: string;
}

const MORE_ROWS = "Pass offset to read the next rows, or narrow the request with a filter or view=summary.";
const CUT_TEXT = "Narrow the request with a filter, limit and offset, or view=summary.";

type Row = Record<string, unknown>;

export const asRecord = (data: unknown): Record<string, unknown> =>
  data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : { result: data };

const _json = (data: unknown): string => (typeof data === "string" ? data : JSON.stringify(data));

export const toolResult = (text: string, structured?: Record<string, unknown>): ToolResult => ({
  content: [{ type: "text", text }],
  ...(structured ? { structuredContent: structured } : {}),
});

const _longestList = (record: Row): string | undefined =>
  Object.entries(record)
    .filter(([, value]) => Array.isArray(value) && value.length > 1)
    .sort(([, a], [, b]) => _json(b).length - _json(a).length)[0]?.[0];

const _withRows = (record: Row, field: string, rows: unknown[], of: number): Row => ({
  ...record,
  [field]: rows,
  trimmed: { field, shown: rows.length, of, hint: MORE_ROWS } satisfies Trimmed,
});

const _fitRows = (record: Row, field: string, maxChars: number): Row | null => {
  const rows = record[field] as unknown[];
  let low = 0;
  let high = rows.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (_json(_withRows(record, field, rows.slice(0, mid), rows.length)).length <= maxChars) low = mid;
    else high = mid - 1;
  }
  return low > 0 ? _withRows(record, field, rows.slice(0, low), rows.length) : null;
};

export const respond = (data: unknown, maxChars: number): ToolResult => {
  const text = _json(data);
  if (text.length <= maxChars) return toolResult(text, asRecord(data));

  const record = asRecord(data);
  const field = _longestList(record);
  const fitted = field ? _fitRows(record, field, maxChars) : null;
  if (fitted) return toolResult(_json(fitted), fitted);

  return toolResult(`${text.slice(0, maxChars)}\n... cut at ${maxChars} of ${text.length} characters. ${CUT_TEXT}`);
};
