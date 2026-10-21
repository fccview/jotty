import { GridViewIcon, ListViewIcon, SchoolReportCardIcon } from "hugeicons-react";

export const VIEW_MODES = ["card", "list", "grid"] as const;

export type ViewMode = (typeof VIEW_MODES)[number];

export const DEFAULT_VIEW_MODE: ViewMode = "card";

export const VIEW_MODE_OPTIONS: {
  id: ViewMode;
  icon: typeof GridViewIcon;
  labelKey: string;
}[] = [
  { id: "card", icon: SchoolReportCardIcon, labelKey: "settingsModal.viewModeCard" },
  { id: "list", icon: ListViewIcon, labelKey: "settingsModal.viewModeList" },
  { id: "grid", icon: GridViewIcon, labelKey: "settingsModal.viewModeGrid" },
];
