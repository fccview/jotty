import yaml from "js-yaml";
import { v4 as uuidv4 } from "uuid";

export interface DocumentMetadata {
  uuid?: string;
  title?: string;
  checklistType?: "task" | "simple";
  [key: string]: any;
}

const YAML_FRONTMATTER_REGEX = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?/;

export const extractYamlMetadata = (
  content: string
): {
  metadata: DocumentMetadata;
  contentWithoutMetadata: string;
} => {
  const match = content.match(YAML_FRONTMATTER_REGEX);

  if (!match) {
    return {
      metadata: {},
      contentWithoutMetadata: content,
    };
  }

  try {
    const yamlContent = match[1];
    const metadata = yaml.load(yamlContent) as DocumentMetadata;

    const contentWithoutMetadata = content
      .replace(YAML_FRONTMATTER_REGEX, "")
      .trim();

    return {
      metadata: metadata || {},
      contentWithoutMetadata,
    };
  } catch (error) {
    console.warn("Failed to parse YAML frontmatter:", error);
    return {
      metadata: {},
      contentWithoutMetadata: content,
    };
  }
};

export const generateYamlFrontmatter = (metadata: DocumentMetadata): string => {
  if (Object.keys(metadata).length === 0) {
    return "";
  }

  try {
    const yamlContent = yaml.dump(metadata, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
    });

    return `---\n${yamlContent}---\n`;
  } catch (error) {
    console.warn("Failed to generate YAML frontmatter:", error);
    return "";
  }
};

export const updateYamlMetadata = (
  content: string,
  metadata: Partial<DocumentMetadata>,
  preserveExisting: boolean = true
): string => {
  const { metadata: existingMetadata, contentWithoutMetadata } =
    extractYamlMetadata(content);

  const finalMetadata = preserveExisting
    ? { ...existingMetadata, ...metadata }
    : metadata;

  const frontmatter = generateYamlFrontmatter(finalMetadata);

  return frontmatter + contentWithoutMetadata;
};

export const extractTitle = (content: string, filename?: string): string => {
  const { metadata, contentWithoutMetadata } = extractYamlMetadata(content);

  if (metadata.title) {
    return metadata.title;
  }

  const lines = contentWithoutMetadata.split("\n");
  const titleLine = lines.find((line) => line.startsWith("# "));
  if (titleLine) {
    return titleLine.replace(/^#\s*/, "").trim();
  }

  if (filename) {
    return filename.replace(/-/g, " ");
  }

  return "Untitled";
};

export const extractChecklistType = (content: string): "task" | "simple" => {
  const { metadata, contentWithoutMetadata } = extractYamlMetadata(content);

  if (metadata.checklistType) {
    return metadata.checklistType;
  }

  if (contentWithoutMetadata.includes("<!-- type:task -->")) {
    return "task";
  }

  return "simple";
};

/**
 * Generates a new UUID
 * @returns UUID string
 */
export const generateUuid = (): string => {
  return uuidv4();
};

/**
 * Migrates legacy title and checklist type to YAML metadata format
 * @param content - Original markdown content
 * @param generateNewUuid - Whether to generate a new UUID if none exists
 * @returns Updated content with YAML metadata
 */
export const migrateToYamlMetadata = (
  content: string,
  generateNewUuid: boolean = true,
  isChecklist: boolean = false
): string => {
  const { metadata, contentWithoutMetadata } = extractYamlMetadata(content);

  let title = metadata.title;
  if (!title) {
    const lines = contentWithoutMetadata.split("\n");
    const titleLine = lines.find((line) => line.startsWith("# "));
    if (titleLine) {
      title = titleLine.replace(/^#\s*/, "").trim();
    }
  }

  let checklistType = metadata.checklistType;
  if (isChecklist && !checklistType) {
    if (contentWithoutMetadata.includes("<!-- type:task -->")) {
      checklistType = "task";
    } else {
      checklistType = "simple";
    }
  }

  let uuid = metadata.uuid;
  if (!uuid && generateNewUuid) {
    uuid = generateUuid();
  }

  const newMetadata: DocumentMetadata = {
    ...metadata,
  };

  if (uuid) newMetadata.uuid = uuid;
  if (title) newMetadata.title = title;
  if (isChecklist && checklistType) newMetadata.checklistType = checklistType;

  const frontmatter = generateYamlFrontmatter(newMetadata);

  let cleanedContent = contentWithoutMetadata;

  if (title && !metadata.title) {
    const lines = cleanedContent.split("\n");
    const titleLineIndex = lines.findIndex((line) => line.startsWith("# "));
    if (titleLineIndex !== -1) {
      lines.splice(titleLineIndex, 1);
      cleanedContent = lines.join("\n").trim();
    }
  }

  if (checklistType && !metadata.checklistType) {
    cleanedContent = cleanedContent
      .replace(/<!-- type:task -->\n?/g, "")
      .trim();
  }

  return frontmatter + cleanedContent;
};

/**
 * Extracts UUID from YAML metadata in content
 * @param content - Markdown content
 * @returns UUID string or undefined
 */
export const extractUuid = (content: string): string | undefined => {
  const { metadata } = extractYamlMetadata(content);
  return metadata.uuid;
};

/**
 * Checks if content has YAML metadata
 * @param content - Markdown content
 * @returns Boolean indicating if YAML metadata exists
 */
export const hasYamlMetadata = (content: string): boolean => {
  return YAML_FRONTMATTER_REGEX.test(content);
};
