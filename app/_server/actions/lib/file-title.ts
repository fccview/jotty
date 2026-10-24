import fs from "fs/promises";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { titleOf } from "@/app/_utils/title-utils";

const _hasStored = (metadata?: Record<string, unknown> | null): boolean => {
  const stored = metadata?.title;
  return typeof stored === "number" || (typeof stored === "string" && stored.trim() !== "");
};

export const titleFromFile = async (
  metadata: Record<string, unknown> | null | undefined,
  filePath: string,
  fileId: string,
): Promise<string> => {
  if (_hasStored(metadata)) return titleOf(metadata, "", fileId);
  try {
    const parsed = extractYamlMetadata(await fs.readFile(filePath, "utf-8"));
    return titleOf(parsed.metadata, parsed.contentWithoutMetadata, fileId);
  } catch (error) {
    console.warn(`Could not read ${filePath} for its title:`, error);
    return titleOf(metadata, "", fileId);
  }
};
