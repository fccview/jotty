import { ReactNode } from "react";

export interface OverflowTool {
  key: string;
  icon: ReactNode;
  label: string;
  isActive?: boolean;
  onSelect?: () => void;
  menu?: ReactNode;
}

export interface ToolbarTool {
  key: string;
  node: ReactNode;
  overflow?: OverflowTool;
}

export const toolbarSeparator = (key: string): ToolbarTool => ({ key, node: null });

export const isSeparator = (tool: ToolbarTool) => !tool.overflow;
