import { EXCALIDRAW_ASSET_PATH, EXCALIDRAW_STYLESHEET } from "@/app/_consts/diagrams";

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string | string[];
  }
}

type ExcalidrawModule = typeof import("@excalidraw/excalidraw");

const STYLESHEET_ID = "excalidraw-lazy-css";
const FALLBACK_LANGUAGE = "en";

let modulePromise: Promise<ExcalidrawModule> | null = null;
let stylesheetPromise: Promise<void> | null = null;

const loadStylesheet = () => {
  stylesheetPromise ??= new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(STYLESHEET_ID);
    if (existing instanceof HTMLLinkElement && existing.sheet) {
      resolve();
      return;
    }
    existing?.remove();
    const link = document.createElement("link");
    link.id = STYLESHEET_ID;
    link.rel = "stylesheet";
    link.href = EXCALIDRAW_STYLESHEET;
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener(
      "error",
      () => {
        link.remove();
        stylesheetPromise = null;
        reject(new Error(`Failed to load ${EXCALIDRAW_STYLESHEET}`));
      },
      { once: true },
    );
    document.head.appendChild(link);
  });
  return stylesheetPromise;
};

export const loadExcalidrawModule = () => {
  window.EXCALIDRAW_ASSET_PATH = EXCALIDRAW_ASSET_PATH;
  modulePromise ??= import("@excalidraw/excalidraw").catch((error) => {
    modulePromise = null;
    throw error;
  });
  return modulePromise;
};

export const loadExcalidraw = async () => {
  const [excalidraw] = await Promise.all([loadExcalidrawModule(), loadStylesheet()]);
  return excalidraw;
};

export const pickLangCode = (locale: string, codes: string[]) => {
  const exact = codes.find((code) => code.toLowerCase() === locale.toLowerCase());
  const prefix = locale.split("-")[0].toLowerCase();
  return exact ?? codes.find((code) => code.split("-")[0].toLowerCase() === prefix) ?? FALLBACK_LANGUAGE;
};
