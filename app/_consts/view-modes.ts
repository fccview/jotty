import { GridViewIcon, ListViewIcon, SchoolReportCardIcon } from "hugeicons-react";

export enum ViewMode {
  CARD = "card",
  LIST = "list",
  GRID = "grid",
}

export const VIEW_MODES = Object.values(ViewMode);

export const DEFAULT_VIEW_MODE = ViewMode.CARD;

export const VIEW_MODE_OPTIONS: {
  id: ViewMode;
  icon: typeof GridViewIcon;
  labelKey: string;
}[] = [
  { id: ViewMode.CARD, icon: SchoolReportCardIcon, labelKey: "settingsModal.viewModeCard" },
  { id: ViewMode.LIST, icon: ListViewIcon, labelKey: "settingsModal.viewModeList" },
  { id: ViewMode.GRID, icon: GridViewIcon, labelKey: "settingsModal.viewModeGrid" },
];
