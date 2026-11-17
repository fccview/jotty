import type { Note } from "@/app/_types";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";

export const copyableMarkdown = (note: Pick<Note, "content" | "encrypted">): string | null =>
  note.encrypted ? null : extractYamlMetadata(note.content).contentWithoutMetadata;
