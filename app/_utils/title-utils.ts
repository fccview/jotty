export const UNTITLED = "Untitled";

const LEADING_H1 = /^#\s+(.+?)\s*$/;

export const leadingHeading = (body: string): string | undefined => {
  const first = body.split(/\r?\n/).find((line) => line.trim() !== "");
  const heading = first?.trim().match(LEADING_H1)?.[1]?.trim();
  return heading || undefined;
};

export const slugTitle = (fileId: string): string => fileId.replace(/-/g, " ");

const _stored = (value: unknown): string | undefined => {
  if (typeof value === "number") return String(value);
  if (typeof value !== "string") return undefined;
  return value.trim() || undefined;
};

export const titleOf = (
  metadata: Record<string, unknown> | null | undefined,
  body: string,
  fileId?: string,
): string =>
  _stored(metadata?.title) ??
  leadingHeading(body) ??
  (fileId ? slugTitle(fileId) : UNTITLED);
