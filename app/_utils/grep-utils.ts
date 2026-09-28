/**
 * @fccview here!
 * Hi all, welcome to the grep-utils.ts file.
 *
 * I was hitting a wall on how to fetch files without a database and performance was going down, massively.
 * And then it struck me, why am I not using grep?!?
 *
 * This is so much more performant, so let me leave you with a beautiful video on
 * the genesis of grep: https://www.youtube.com/watch?v=NTfOnGZUZDk
 *
 * Enjoy it <3
 */

import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import yaml from "js-yaml";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { isPathUuid, pathUuid } from "@/app/_server/actions/lib/read-only";
import { boxedShell } from "@/app/_utils/shell-utils";

const execFileAsync = promisify(execFile);

const LINE_BREAK = /[\r\n]/;

const _fieldLine = (field: string, value: string): string | null =>
  LINE_BREAK.test(value) ? null : `${field}: ${value}`;

const _isNoMatch = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: number }).code === 1;

export interface GrepFileResult {
  filePath: string;
  id: string;
  category: string;
}

export interface GrepMetadataResult {
  filePath: string;
  id: string;
  category: string;
  metadata: Record<string, any>;
}

export const grepFindFileByField = async (
  dir: string,
  field: string,
  value: string,
): Promise<GrepFileResult | null> => {
  const line = _fieldLine(field, value);
  if (!line) return null;

  try {
    const stdout = await boxedShell(
      'grep -rlxF --include="*.md" -e "$1" -- "$2" 2>/dev/null | head -1 || true',
      [line, dir],
    );

    const filePath = stdout.trim();
    if (!filePath) {
      return null;
    }

    const relativePath = path.relative(dir, filePath);
    const parts = relativePath.split(path.sep);
    const filename = parts.pop() || "";
    const id = path.basename(filename, ".md");
    const category = parts.join("/");

    return { filePath, id, category };
  } catch (error) {
    console.error("grepFindFileByField failed:", error);
    return null;
  }
};

const _storedUuid = async (filePath: string): Promise<string | undefined> => {
  try {
    const { uuid } = extractYamlMetadata(await fs.readFile(filePath, "utf-8"))
      .metadata;
    return typeof uuid === "string" && uuid ? uuid : undefined;
  } catch (error) {
    console.error("Failed to read frontmatter for derived uuid:", filePath, error);
    return undefined;
  }
};

const _findUnstamped = async (
  dir: string,
  uuid: string,
): Promise<GrepFileResult | null> => {
  if (!isPathUuid(uuid)) return null;

  const match = (await grepListAllFiles(dir)).find(
    (file) => pathUuid(file.filePath) === uuid,
  );
  if (!match || (await _storedUuid(match.filePath))) return null;

  return match;
};

export const grepFindFileByUuid = async (
  dir: string,
  uuid: string,
): Promise<GrepFileResult | null> =>
  (await grepFindFileByField(dir, "uuid", uuid)) ||
  (await _findUnstamped(dir, uuid));

export const grepFindFilesByField = async (
  dir: string,
  field: string,
  value: string,
): Promise<GrepFileResult[]> => {
  const line = _fieldLine(field, value);
  if (!line) return [];

  try {
    const stdout = await boxedShell(
      'grep -rlxF --include="*.md" -e "$1" -- "$2" 2>/dev/null || true',
      [line, dir],
    );

    const files = stdout.trim().split("\n").filter(Boolean);
    return files.map((filePath) => {
      const relativePath = path.relative(dir, filePath);
      const parts = relativePath.split(path.sep);
      const filename = parts.pop() || "";
      const id = path.basename(filename, ".md");
      const category = parts.join("/");
      return { filePath, id, category };
    });
  } catch (error) {
    console.error("grepFindFilesByField failed:", error);
    return [];
  }
};

export const grepFilesByText = async (
  dir: string,
  text: string,
  include: string,
): Promise<string[]> => {
  try {
    const { stdout } = await execFileAsync("grep", [
      "-rlF",
      text,
      dir,
      `--include=${include}`,
    ]);
    return stdout.trim().split("\n").filter(Boolean);
  } catch (error) {
    if (!_isNoMatch(error)) {
      console.error("Error in grepFilesByText:", error);
    }
    return [];
  }
};

export const grepExtractAllFrontmatters = async (
  dir: string,
): Promise<Map<string, Record<string, unknown>>> => {
  try {
    const stdout = await boxedShell(
      `find "$1" -name "*.md" -type f -print0 | sort -z | xargs -0 awk '` +
        `FNR==1{if(NR>1)print "ENDFILE";print "FILE:"FILENAME;in_fm=($0=="---");next}` +
        `in_fm&&/^---$/{in_fm=0;next}in_fm{print}END{print "ENDFILE"}' 2>/dev/null || true`,
      [dir],
      { maxBuffer: 50 * 1024 * 1024 },
    );

    const result = new Map<string, Record<string, unknown>>();
    let currentFile = "";
    let currentLines: string[] = [];

    for (const line of stdout.split("\n")) {
      if (line.startsWith("FILE:")) {
        currentFile = line.slice(5);
        currentLines = [];
      } else if (line === "ENDFILE") {
        if (currentFile && currentLines.length > 0) {
          try {
            const parsed = yaml.load(currentLines.join("\n"));
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              result.set(currentFile, parsed as Record<string, unknown>);
            }
          } catch {}
        }
        currentFile = "";
        currentLines = [];
      } else if (currentFile) {
        currentLines.push(line);
      }
    }

    return result;
  } catch (error) {
    console.error("grepExtractAllFrontmatters failed:", error);
    return new Map();
  }
};

export const grepExtractFrontmatter = async (
  filePath: string,
): Promise<Record<string, unknown> | null> => {
  try {
    const stdout = await boxedShell(
      `sed -n '1{/^---$/!q;}; 2,/^---$/{/^---$/q;p;}' "$1" 2>/dev/null || true`,
      [filePath],
    );

    const yamlContent = stdout.trim();
    if (!yamlContent) {
      return null;
    }

    const parsed = yaml.load(yamlContent);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch (error) {
    console.error("grepExtractFrontmatter failed:", filePath, error);
    return null;
  }
};

export const grepListAllFiles = async (
  dir: string,
): Promise<GrepFileResult[]> => {
  try {
    const stdout = await boxedShell(
      'find "$1" -name "*.md" -type f 2>/dev/null || true',
      [dir],
    );

    const files = stdout.trim().split("\n").filter(Boolean);
    return files.map((filePath) => {
      const relativePath = path.relative(dir, filePath);
      const parts = relativePath.split(path.sep);
      const filename = parts.pop() || "";
      const id = path.basename(filename, ".md");
      const category = parts.join("/");
      return { filePath, id, category };
    });
  } catch (error) {
    console.error("grepListAllFiles failed:", error);
    return [];
  }
};

export const grepListFilesWithMetadata = async (
  dir: string,
): Promise<GrepMetadataResult[]> => {
  try {
    const files = await grepListAllFiles(dir);
    const results: GrepMetadataResult[] = [];

    for (const file of files) {
      const metadata = await grepExtractFrontmatter(file.filePath);
      results.push({
        ...file,
        metadata: metadata || {},
      });
    }

    return results;
  } catch {
    return [];
  }
};

export const grepExtractField = async (
  filePath: string,
  field: string,
): Promise<string | null> => {
  try {
    const stdout = await boxedShell(
      'grep -m1 -e "^$2:" -- "$1" 2>/dev/null || true',
      [filePath, field],
    );

    const value = stdout.trim().slice(field.length + 1).trim();
    if (!value) {
      return null;
    }

    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1);
    }

    return value;
  } catch (error) {
    console.error("grepExtractField failed:", filePath, error);
    return null;
  }
};

export interface GrepSearchResult extends GrepFileResult {
  matchLine: string;
}

export const grepSearchContent = async (
  dir: string,
  pattern: string,
): Promise<GrepSearchResult[]> => {
  try {
    const { stdout } = await execFileAsync("grep", [
      "-rli",
      "--include=*.md",
      "--",
      pattern,
      dir,
    ]);

    const files = stdout.trim().split("\n").filter(Boolean);

    const results = await Promise.all(
      files.map(async (filePath) => {
        const relativePath = path.relative(dir, filePath);
        const parts = relativePath.split(path.sep);
        const filename = parts.pop() || "";
        const id = path.basename(filename, ".md");
        const category = parts.join("/");

        let matchLine = "";
        try {
          const { stdout: matchOut } = await execFileAsync("grep", [
            "-im1",
            "--",
            pattern,
            filePath,
          ]);
          matchLine = matchOut.trim();
        } catch (error) {
          if (!_isNoMatch(error)) {
            console.error("grep match-line failed:", error);
          }
        }

        return { filePath, id, category, matchLine };
      }),
    );

    return results;
  } catch (error) {
    if (!_isNoMatch(error)) {
      console.error("grepSearchContent failed:", error);
    }
    return [];
  }
};

const FENCE = "```";
const EXCERPT_BUFFER = 2048;

const fullCodeBlock = (text: string, length: number): string => {
  if (text.length <= length) return text.trim();

  const cut = text.slice(0, length);
  const fenceCount = (cut.match(/```/g) || []).length;

  if (fenceCount % 2 === 0) return cut.trim();

  const nextFence = text.indexOf(FENCE, length);

  if (nextFence === -1) return cut.trim();

  return text.slice(0, nextFence + FENCE.length).trim();
};

export const grepExtractExcerpt = async (
  filePath: string,
  length: number = 200,
): Promise<string> => {
  try {
    const cap = length + EXCERPT_BUFFER;
    const stdout = await boxedShell(
      `sed '1{/^---$/!{p;d;};}; /^---$/,/^---$/d' "$1" 2>/dev/null | head -c "$2" || true`,
      [filePath, String(cap)],
    );
    return fullCodeBlock(stdout, length);
  } catch (error) {
    console.error("grepExtractExcerpt failed:", filePath, error);
    return "";
  }
};
