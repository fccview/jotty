import type { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

const SCENE_TYPE = "excalidraw";
const IMAGE_TYPE = "image";

const SAVED_APP_STATE = [
  "viewBackgroundColor",
  "currentItemStrokeColor",
  "currentItemBackgroundColor",
  "currentItemFillStyle",
  "currentItemStrokeWidth",
  "currentItemRoughness",
  "currentItemOpacity",
  "gridSize",
] as const;

type SavedKey = (typeof SAVED_APP_STATE)[number];

export type SavedAppState = Partial<Pick<AppState, SavedKey>>;

export interface StoredScene {
  type: typeof SCENE_TYPE;
  elements: readonly ExcalidrawElement[];
  appState: SavedAppState;
  files: BinaryFiles;
}

export enum SceneStatus {
  Ready = "ready",
  Unreadable = "unreadable",
}

export type SceneRead =
  | { status: SceneStatus.Ready; scene: StoredScene }
  | { status: SceneStatus.Unreadable; error: unknown };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const emptyScene = (): StoredScene => ({
  type: SCENE_TYPE,
  elements: [],
  appState: {},
  files: {},
});

export const pickAppState = (appState: unknown): SavedAppState => {
  if (!isRecord(appState)) return {};
  return Object.fromEntries(
    SAVED_APP_STATE.filter((key) => appState[key] !== undefined).map((key) => [key, appState[key]]),
  ) as SavedAppState;
};

export const usedFiles = (elements: readonly ExcalidrawElement[], files: BinaryFiles | null | undefined): BinaryFiles => {
  if (!files) return {};
  const ids = new Set<FileId>(
    elements.flatMap((element) =>
      element.type === IMAGE_TYPE && !element.isDeleted && element.fileId ? [element.fileId] : [],
    ),
  );
  return Object.fromEntries(Object.entries(files).filter(([id]) => ids.has(id as FileId)));
};

export const readScene = (data: string | null | undefined): SceneRead => {
  if (!data || data === "null") return { status: SceneStatus.Ready, scene: emptyScene() };
  try {
    const parsed: unknown = JSON.parse(data);
    if (!isRecord(parsed) || (parsed.elements !== undefined && !Array.isArray(parsed.elements))) {
      throw new Error("Excalidraw scene has no element list");
    }
    const elements = (parsed.elements ?? []) as readonly ExcalidrawElement[];
    return {
      status: SceneStatus.Ready,
      scene: {
        type: SCENE_TYPE,
        elements,
        appState: pickAppState(parsed.appState),
        files: isRecord(parsed.files) ? (parsed.files as BinaryFiles) : {},
      },
    };
  } catch (error) {
    console.error("Failed to read Excalidraw scene:", error);
    return { status: SceneStatus.Unreadable, error };
  }
};

export const buildScene = (
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles | null | undefined,
): StoredScene => {
  const live = elements.filter((element) => !element.isDeleted);
  return {
    type: SCENE_TYPE,
    elements: live,
    appState: pickAppState(appState),
    files: usedFiles(live, files),
  };
};

export const hasDrawing = (scene: StoredScene) => scene.elements.some((element) => !element.isDeleted);

export const serializeScene = (scene: StoredScene): string | null =>
  hasDrawing(scene) ? JSON.stringify(scene) : null;
