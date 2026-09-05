const STORAGE_KEY = "modal-enlarged";

type EnlargedMap = Record<string, boolean>;

const readEnlargedMap = (): EnlargedMap => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as EnlargedMap;
    }
    return {};
  } catch {
    return {};
  }
};

export const readModalEnlarged = (
  storageKey: string | undefined,
  fallback: boolean,
): boolean => {
  if (!storageKey) return fallback;
  const stored = readEnlargedMap()[storageKey];
  return typeof stored === "boolean" ? stored : fallback;
};

export const writeModalEnlarged = (
  storageKey: string | undefined,
  value: boolean,
): void => {
  if (!storageKey || typeof window === "undefined") return;
  try {
    const map = readEnlargedMap();
    map[storageKey] = value;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota / privacy mode errors */
  }
};