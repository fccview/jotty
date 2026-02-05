import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import yaml from "js-yaml";

const execAsync = promisify(exec);

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
  try {
    const escapedValue = value.replace(/['"\\]/g, "\\$&");
    const { stdout } = await execAsync(
      `grep -rl "^${field}: ${escapedValue}$" "${dir}" --include="*.md" 2>/dev/null | head -1 || true`,
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
  } catch {
    return null;
  }
};

export const grepFindFileByUuid = async (
  dir: string,
  uuid: string,
): Promise<GrepFileResult | null> => {
  return grepFindFileByField(dir, "uuid", uuid);
};

export const grepCheckUuidExists = async (
  dir: string,
  uuid: string,
): Promise<boolean> => {
  try {
    const { stdout } = await execAsync(
      `grep -rl "uuid: ${uuid}" "${dir}" --include="*.md" 2>/dev/null || true`,
    );
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
};

export const grepFindFilesByField = async (
  dir: string,
  field: string,
  value: string,
): Promise<GrepFileResult[]> => {
  try {
    const escapedValue = value.replace(/['"\\]/g, "\\$&");
    const { stdout } = await execAsync(
      `grep -rl "^${field}: ${escapedValue}$" "${dir}" --include="*.md" 2>/dev/null || true`,
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
  } catch {
    return [];
  }
};

export const grepExtractFrontmatter = async (
  filePath: string,
): Promise<Record<string, unknown> | null> => {
  try {
    const { stdout } = await execAsync(
      `sed -n '1{/^---$/!q}; 2,/^---$/{/^---$/q;p}' "${filePath}" 2>/dev/null || true`,
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
  } catch {
    return null;
  }
};

export const grepListAllFiles = async (
  dir: string,
): Promise<GrepFileResult[]> => {
  try {
    const { stdout } = await execAsync(
      `find "${dir}" -name "*.md" -type f 2>/dev/null || true`,
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
  } catch {
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
    const { stdout } = await execAsync(
      `grep -m1 "^${field}:" "${filePath}" 2>/dev/null | sed 's/^${field}: *//' || true`,
    );

    const value = stdout.trim();
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
  } catch {
    return null;
  }
};

export const grepSearchContent = async (
  dir: string,
  pattern: string,
): Promise<GrepFileResult[]> => {
  try {
    const { stdout } = await execAsync(
      `grep -rli "${pattern}" "${dir}" --include="*.md" 2>/dev/null || true`,
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
  } catch {
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
    const { stdout } = await execAsync(
      `sed '1{/^---$/!{p;d}}; /^---$/,/^---$/d' "${filePath}" 2>/dev/null | head -c ${cap} || true`,
    );
    return fullCodeBlock(stdout, length);
  } catch {
    return "";
  }
};
