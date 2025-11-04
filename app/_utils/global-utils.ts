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
  return encodedCategory ? `${encodedCategory}/${id}` : id;
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
