import { promises as fs } from "fs";
import path from "path";
import slugify from "slugify";
import { FileRenameMode } from "@/app/_types";

const invalidFilenameChars = /[<>:"/\\|?*\x00-\x1F]/g;
const leadingTrailingJunk = /^[. ]+|[. ]+$/g;

export const sanitizeFilename = (title: string, mode: FileRenameMode = "none"): string => {
  if (!title) return "";

  switch (mode) {
    case "dash-case":
      const transliterated = slugify(title, {
        lower: true,
        strict: false,
        replacement: '-',
        locale: "en",
      });
      return transliterated
        .replace(invalidFilenameChars, "")
        .replace(leadingTrailingJunk, "")
        .trim();

    case "minimal":
      return title
        .replace(invalidFilenameChars, "")
        .replace(leadingTrailingJunk, "")
        .trim();

    case "none":
      return title;

    default:
      return title
        .replace(invalidFilenameChars, "")
        .replace(leadingTrailingJunk, "")
        .trim();
  }
};

export const generateUniqueFilename = async (
  directory: string,
  baseTitle: string,
  extension: string = ".md",
  mode: FileRenameMode = "minimal"
): Promise<string> => {
  let sanitizedTitle = sanitizeFilename(baseTitle, mode);

  if (!sanitizedTitle) {
    const uid = `${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    sanitizedTitle = uid;
  }

  let filename = `${sanitizedTitle}${extension}`;
  let counter = 1;

  while (true) {
    const filePath = path.join(directory, filename);
    try {
      await fs.access(filePath);
      filename = `${sanitizedTitle}-${counter}${extension}`;
      counter++;
    } catch {
      break;
    }
  }

  return filename;
};