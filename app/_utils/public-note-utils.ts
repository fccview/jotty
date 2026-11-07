import type { Note } from "@/app/_types";

export const copyableMarkdown = (note: Pick<Note, "content" | "encrypted">): string | null =>
  note.encrypted ? null : note.content;
