import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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
    return "";
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
