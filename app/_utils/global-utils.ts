import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { AppMode, Checklist, Note, Result } from "../_types";
import { updateNote } from "../_server/actions/note";
import { getCurrentUser } from "../_server/actions/users";
import { Modes } from "../_types/enums";
import { updateList } from "../_server/actions/checklist";
import { ARCHIVED_DIR_NAME } from "../_consts/files";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const isMobileDevice = (): boolean => {
  if (typeof window === "undefined") return false;

  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) ||
    window.innerWidth <= 768 ||
    ("ontouchstart" in window && window.innerWidth <= 1024)
  );
};

export const getDeviceInfo = (userAgent: string): string => {
  if (userAgent.includes("iPhone")) return "iPhone";
  if (userAgent.includes("iPad")) return "iPad";
  if (userAgent.includes("Android")) return "Android";
  if (userAgent.includes("Macintosh")) return "Mac";
  if (userAgent.includes("Windows")) return "Windows";
  if (userAgent.includes("Linux")) return "Linux";
  return "Unknown Device";
};

export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (!successful) {
        throw new Error("Fallback copy failed");
      }
      return true;
    }
  } catch (error) {
    console.error("Failed to copy text:", error);
    return false;
  }
};

export function encodeCategoryPath(categoryPath: string): string {
  if (!categoryPath || categoryPath === "Uncategorized") {
    return "Uncategorized";
  }

  if (categoryPath.includes("%20") || categoryPath.includes("%2F")) {
    return categoryPath;
  }

  return categoryPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function decodeCategoryPath(encodedPath: string): string {
  if (!encodedPath) {
    return "Uncategorized";
  }

  return encodedPath
    .split("/")
    .map((segment) => decodeURIComponent(segment))
    .join("/");
}

export function buildCategoryPath(category: string, id: string): string {
  const encodedCategory = encodeCategoryPath(category);
  return encodedCategory ? `${encodedCategory}/${encodeId(id)}` : encodeId(id);
}

export function decodeId(encodedId: string): string {
  if (!encodedId) {
    return encodedId;
  }
  return decodeURIComponent(encodedId);
}

export function encodeId(id: string): string {
  return encodeURIComponent(id);
}

export const generateWebManifest = (
  appName: string,
  appDescription: string,
  app16x16Icon: string,
  app32x32Icon: string,
  app180x180Icon: string,
  app512x512Icon: string,
  app192x192Icon: string,
  themeColor: string,
  appVersion: string
): string => {
  return JSON.stringify({
    name: appName,
    short_name: appName,
    description: appDescription,
    start_url: "/",
    display: "standalone",
    background_color: themeColor,
    theme_color: themeColor,
    orientation: "portrait-primary",
    icons: [
      {
        src: app192x192Icon || "/app-icons/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: app512x512Icon || "/app-icons/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: app16x16Icon,
        sizes: "16x16",
        type: "image/png",
      },
      {
        src: app32x32Icon,
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: app180x180Icon,
        sizes: "180x180",
        type: "image/png",
      },
    ],
    version: appVersion,
  });
};

// ============================================================================
// UUID Utilities for Item Identification
// ============================================================================

/**
 * Generate a new UUIDv4
 * Uses crypto.randomUUID() in modern environments
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older environments (should rarely be needed)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Validate if a string is a valid UUIDv4
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Extract UUID from markdown content
 * Looks for <!-- jotty_id: <uuid> --> comment at the start of the file
 */
export function extractUUIDFromMarkdown(markdown: string): string | undefined {
  const uuidRegex = /<!--\s*jotty_id:\s*([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\s*-->/i;
  const match = markdown.match(uuidRegex);

  if (match && validateUUID(match[1])) {
    return match[1];
  }

  return undefined;
}

/**
 * Add or update UUID comment in markdown content
 * Adds <!-- jotty_id: <uuid> --> at the very top of the file
 * If UUID already exists, updates it
 */
export function addUUIDToMarkdown(markdown: string, uuid: string): string {
  const uuidComment = `<!-- jotty_id: ${uuid} -->\n`;

  // Check if UUID comment already exists
  const existingUUIDRegex = /<!--\s*jotty_id:\s*[0-9a-f-]+\s*-->\n?/i;

  if (existingUUIDRegex.test(markdown)) {
    // Replace existing UUID
    return markdown.replace(existingUUIDRegex, uuidComment);
  } else {
    // Add new UUID at the top
    return uuidComment + markdown;
  }
}

/**
 * Remove UUID comment from markdown content
 * Useful for display purposes or when exporting
 */
export function removeUUIDFromMarkdown(markdown: string): string {
  const uuidRegex = /<!--\s*jotty_id:\s*[0-9a-f-]+\s*-->\n?/i;
  return markdown.replace(uuidRegex, '');
}
