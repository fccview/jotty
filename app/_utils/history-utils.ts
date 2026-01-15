import { diffLines, Change } from "diff";

type TranslationFunction = (key: string, options?: any) => string;

const actionTranslationKeys: Record<string, string> = {
  create: "history.actionCreate",
  update: "history.actionUpdate",
  rename: "history.actionRename",
  move: "history.actionMove",
  delete: "history.actionDelete",
  init: "history.actionInit",
};

export const getActionLabel = (
  action: string,
  t?: TranslationFunction
): string => {
  const key = actionTranslationKeys[action] || "history.actionUnknown";

  if (t) {
    return t(key);
  }

  const fallbacks: Record<string, string> = {
    create: "Created",
    update: "Updated",
    rename: "Renamed",
    move: "Moved",
    delete: "Deleted",
    init: "Initialized",
  };
  return fallbacks[action] || "Changed";
};

export const getActionColor = (
  action: string
): "default" | "success" | "warning" | "destructive" => {
  const colors: Record<
    string,
    "default" | "success" | "warning" | "destructive"
  > = {
    create: "success",
    update: "default",
    rename: "warning",
    move: "warning",
    delete: "destructive",
    init: "default",
  };
  return colors[action] || "default";
};

export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
}

export const computeDiff = (
  oldContent: string,
  newContent: string
): DiffLine[] => {
  const changes: Change[] = diffLines(oldContent, newContent);
  const result: DiffLine[] = [];

  for (const change of changes) {
    const lines = change.value.split("\n");
    if (lines[lines.length - 1] === "") {
      lines.pop();
    }

    for (const line of lines) {
      if (change.added) {
        result.push({ type: "added", content: line });
      } else if (change.removed) {
        result.push({ type: "removed", content: line });
      } else {
        result.push({ type: "unchanged", content: line });
      }
    }
  }

  return result;
};

export const hasChanges = (diffLines: DiffLine[]): boolean => {
  return diffLines.some(
    (line) => line.type === "added" || line.type === "removed"
  );
};
