import path from "path";
import fs from "fs/promises";
import { extractYamlMetadata, generateUuid } from "@/app/_utils/yaml-metadata-utils";
import { serverWriteFile } from "@/app/_server/actions/file";
import { singleFlight } from "@/app/_server/actions/lib/concurrency";
import {
  isWritable,
  pathUuid,
  warnReadOnly,
} from "@/app/_server/actions/lib/read-only";

const FRONTMATTER_OPEN = /^(\uFEFF?---\r?\n)/;
const FRONTMATTER_BLOCK = /^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;
const UUID_LINE = /^uuid:\s*\S+/m;

const _withUuid = (content: string, uuid: string): string =>
  FRONTMATTER_OPEN.test(content)
    ? content.replace(FRONTMATTER_OPEN, `$1uuid: ${uuid}\n`)
    : `---\nuuid: ${uuid}\n---\n\n${content}`;

const _stampable = (content: string, filePath: string): boolean => {
  if (!content.trim()) {
    console.warn("Refusing to stamp uuid on an empty read:", filePath);
    return false;
  }

  const block = content.match(FRONTMATTER_BLOCK)?.[0];
  if (!block) return true;

  if (UUID_LINE.test(block)) {
    console.warn("Frontmatter has a uuid line that did not parse, leaving it alone:", filePath);
    return false;
  }

  const opened = FRONTMATTER_OPEN.test(content);
  const parsed = Object.keys(extractYamlMetadata(content).metadata).length > 0;
  if (opened && !parsed && block.split("\n").length > 3) {
    console.warn("Frontmatter did not parse, refusing to stamp uuid:", filePath);
    return false;
  }

  return true;
};

export const lacksUuid = (content: string): boolean =>
  !UUID_LINE.test(content.match(FRONTMATTER_BLOCK)?.[0] || "");

export const stampUuid = (filePath: string): Promise<string | undefined> =>
  singleFlight(`stamp:${filePath}`, async () => {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const existing = extractYamlMetadata(content).metadata.uuid;
      if (typeof existing === "string" && existing) return existing;

      if (!(await isWritable(path.dirname(filePath)))) {
        warnReadOnly(path.dirname(filePath));
        return pathUuid(filePath);
      }

      if (!_stampable(content, filePath)) return undefined;

      const uuid = generateUuid();
      await serverWriteFile(filePath, _withUuid(content, uuid));
      return uuid;
    } catch (error) {
      console.error("Failed to stamp uuid:", filePath, error);
      return undefined;
    }
  });
