import { GridViewIcon, ListViewIcon, SchoolReportCardIcon } from "hugeicons-react";

export type ViewMode = "card" | "list" | "grid";

export const VIEW_MODE_OPTIONS: {
  id: ViewMode;
  icon: typeof GridViewIcon;
  labelKey: string;
}[] = [
  { id: "card", icon: SchoolReportCardIcon, labelKey: "settingsModal.viewModeCard" },
  { id: "list", icon: ListViewIcon, labelKey: "settingsModal.viewModeList" },
  { id: "grid", icon: GridViewIcon, labelKey: "settingsModal.viewModeGrid" },
];
