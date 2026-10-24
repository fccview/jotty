import path from "path";
import fs from "fs/promises";
import { extractYamlMetadata, generateUuid } from "@/app/_utils/yaml-metadata-utils";
import { serverWriteFile } from "@/app/_server/actions/file";
import { singleFlight } from "@/app/_server/actions/lib/concurrency";
import { StampRefusals } from "@/app/_consts/identity";
import {
  isWritable,
  pathUuid,
  uuidOf,
  warnReadOnly,
} from "@/app/_server/actions/lib/read-only";

const FRONTMATTER_OPEN = /^(\uFEFF?---\r?\n)/;
const FRONTMATTER_BLOCK = /^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;
const UUID_LINE = /^uuid:[ \t]*\S+/m;
const EMPTY_UUID_LINE = /^uuid:[ \t]*(\r?)$/m;

const _withUuid = (content: string, uuid: string): string => {
  if (!FRONTMATTER_OPEN.test(content)) return `---\nuuid: ${uuid}\n---\n\n${content}`;
  const block = content.match(FRONTMATTER_BLOCK)?.[0];
  if (block && EMPTY_UUID_LINE.test(block)) {
    return block.replace(EMPTY_UUID_LINE, `uuid: ${uuid}$1`) + content.slice(block.length);
  }
  return content.replace(FRONTMATTER_OPEN, `$1uuid: ${uuid}\n`);
};

const warned = new Set<string>();

const _warnOnce = (message: string, filePath: string) => {
  if (warned.has(`${message}${filePath}`)) return;
  warned.add(`${message}${filePath}`);
  console.warn(message, filePath);
};

const _reads = (content: string, uuid: string): boolean =>
  uuidOf(extractYamlMetadata(content).metadata.uuid) === uuid;

export interface Claim {
  uuid: string;
  refusal?: StampRefusals;
}

const REFUSAL_WARNINGS: Record<StampRefusals, string> = {
  [StampRefusals.EMPTY]: "Refusing to stamp uuid on an empty read:",
  [StampRefusals.UNPARSABLE]: "Frontmatter did not parse, refusing to stamp uuid:",
  [StampRefusals.FOREIGN_UUID]: "Frontmatter has a uuid line that did not parse, leaving it alone:",
};

export const refusalOf = (content: string): StampRefusals | null => {
  if (!content.trim()) return StampRefusals.EMPTY;

  const block = content.match(FRONTMATTER_BLOCK)?.[0];
  if (!block) return null;
  if (UUID_LINE.test(block)) return StampRefusals.FOREIGN_UUID;

  const parsed = Object.keys(extractYamlMetadata(content).metadata).length > 0;
  if (!parsed && block.split("\n").length > 3) return StampRefusals.UNPARSABLE;

  return null;
};

export const stampedContent = (content: string, uuid: string): string | null => {
  const stamped = _withUuid(content, uuid);
  return _reads(stamped, uuid) ? stamped : null;
};

export const lacksUuid = (content: string): boolean =>
  !uuidOf(extractYamlMetadata(content).metadata.uuid);

const _claim = async (filePath: string): Promise<Claim | undefined> => {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    const existing = uuidOf(extractYamlMetadata(content).metadata.uuid);
    if (existing) return { uuid: existing };

    if (!(await isWritable(path.dirname(filePath)))) {
      warnReadOnly(path.dirname(filePath));
      return { uuid: pathUuid(filePath) };
    }

    const uuid = generateUuid();
    const refusal = refusalOf(content);
    const stamped = refusal ? null : stampedContent(content, uuid);
    if (!stamped) {
      const reason = refusal || StampRefusals.UNPARSABLE;
      _warnOnce(REFUSAL_WARNINGS[reason], filePath);
      return { uuid: pathUuid(filePath), refusal: reason };
    }

    await serverWriteFile(filePath, stamped);
    return { uuid };
  } catch (error) {
    console.error("Failed to stamp uuid:", filePath, error);
    return undefined;
  }
};

export const claimUuid = (filePath: string): Promise<Claim | undefined> =>
  singleFlight(`stamp:${filePath}`, () => _claim(filePath));

export const stampUuid = async (filePath: string): Promise<string | undefined> =>
  (await claimUuid(filePath))?.uuid;

export const claimOf = async (stored: unknown, filePath: string): Promise<Claim | undefined> => {
  const uuid = uuidOf(stored);
  return uuid ? { uuid } : claimUuid(filePath);
};
