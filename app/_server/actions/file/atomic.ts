import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { extractYamlMetadata, toIso } from "@/app/_utils/yaml-metadata-utils";

const FRONTMATTER_OPEN = /^(\uFEFF?---\r?\n)/;

const _realTarget = async (filePath: string): Promise<string> => {
  try {
    return await fs.realpath(filePath);
  } catch {
    return filePath;
  }
};

export const atomicWrite = async (filePath: string, content: string) => {
  const target = await _realTarget(filePath);
  const tmpPath = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${randomUUID()}.tmp`,
  );

  try {
    await fs.writeFile(tmpPath, content, "utf-8");
    await fs.rename(tmpPath, target);
  } catch (error) {
    console.error(`Atomic write failed for ${filePath}:`, error);
    await fs.unlink(tmpPath).catch(() => undefined);
    throw error;
  }
};

const _existingCreatedAt = async (filePath: string): Promise<string> => {
  try {
    const existing = await fs.readFile(filePath, "utf-8");
    const stamped = extractYamlMetadata(existing).metadata.createdAt;
    if (stamped) return toIso(stamped);

    const stats = await fs.stat(filePath);
    return toIso(stats.birthtime.getTime() > 0 ? stats.birthtime : stats.mtime);
  } catch {
    return new Date().toISOString();
  }
};

export const withCreatedAt = async (
  filePath: string,
  content: string,
): Promise<string> => {
  if (!FRONTMATTER_OPEN.test(content)) return content;
  if (extractYamlMetadata(content).metadata.createdAt) return content;

  const createdAt = await _existingCreatedAt(filePath);
  return content.replace(FRONTMATTER_OPEN, `$1createdAt: "${createdAt}"\n`);
};
