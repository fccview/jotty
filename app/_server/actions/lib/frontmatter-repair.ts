import yaml from "js-yaml";
import { isUuid } from "@/app/_consts/identity";
import { OwnedMetaKeys } from "@/app/_utils/yaml-metadata-utils";
import { stampedContent } from "@/app/_server/actions/lib/stamp-uuid";

export const PREVIOUS_UUID_KEY = "previousUuid";

const FRONTMATTER_PARTS = /^(\uFEFF?---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/;
const LEADING_WHITESPACE = /^[ \t]+/;
const TAB = "\t";
const TAB_SPACES = "  ";
const MAPPING_LINE = /^(\s*)([^\s#:][^:]*?):[ \t]+(\S.*?)\s*$/;
const LIST_LINE = /^(\s*)-[ \t]+(\S.*?)\s*$/;
const BLOCK_SCALAR = /^[|>][+-]?\d*$/;
const PROBE_KEY = "probe";
const QUOTED = /^(["']).*\1$/;

const _indent = (line: string): number => line.match(/^ */)?.[0].length ?? 0;

const _untabbed = (line: string): string =>
  line.replace(LEADING_WHITESPACE, (lead) => lead.split(TAB).join(TAB_SPACES));

const _plainOk = (value: string): boolean => {
  try {
    const loaded = yaml.load(`${PROBE_KEY}: ${value}`) as Record<string, unknown> | null;
    return Boolean(loaded) && PROBE_KEY in loaded!;
  } catch {
    return false;
  }
};

const _quoted = (value: string): string => (_plainOk(value) ? value : JSON.stringify(value));

const _repairLine = (line: string): string => {
  const mapping = line.match(MAPPING_LINE);
  if (mapping) {
    const [, lead, key, value] = mapping;
    if (lead === "" && key.trim() === OwnedMetaKeys.UUID && !isUuid(value)) {
      return `${PREVIOUS_UUID_KEY}: ${QUOTED.test(value) ? value : JSON.stringify(value)}`;
    }
    return `${lead}${key}: ${_quoted(value)}`;
  }

  const item = line.match(LIST_LINE);
  if (item) return `${item[1]}- ${_quoted(item[2])}`;

  return line;
};

const _repairBlock = (block: string): string => {
  const eol = block.includes("\r\n") ? "\r\n" : "\n";
  let scalarIndent: number | null = null;

  return block
    .split(/\r?\n/)
    .map((raw) => {
      const line = _untabbed(raw);
      if (scalarIndent !== null) {
        if (!line.trim() || _indent(line) > scalarIndent) return line;
        scalarIndent = null;
      }

      const mapping = line.match(MAPPING_LINE);
      if (mapping && BLOCK_SCALAR.test(mapping[3])) {
        scalarIndent = _indent(line);
        return line;
      }

      return _repairLine(line);
    })
    .join(eol);
};

export const repairFrontmatter = (content: string, uuid: string): string | null => {
  if (!content.trim()) return `---\nuuid: ${uuid}\n---\n`;

  const parts = content.match(FRONTMATTER_PARTS);
  if (!parts) return stampedContent(content, uuid);

  const [whole, open, block, close] = parts;
  const repaired = `${open}${_repairBlock(block)}${close}${content.slice(whole.length)}`;
  return stampedContent(repaired, uuid);
};
