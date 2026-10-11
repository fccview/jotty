"use client";

import { ReactNode } from "react";
import {
  TOOLBAR_RESERVE_ATTR,
  TOOLBAR_SLOT_ATTR,
  useToolbarOverflow,
} from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/EditorHooks/useToolbarOverflow";
import { isSeparator, OverflowTool, ToolbarTool } from "./toolbarTools";

interface OverflowToolbarRowProps {
  tools: ToolbarTool[];
  renderMore: (hidden: OverflowTool[]) => ReactNode;
}

const Separator = () => <div className="w-px h-6 bg-border mx-2" />;

export const OverflowToolbarRow = ({ tools, renderMore }: OverflowToolbarRowProps) => {
  const { rowRef, visibleCount } = useToolbarOverflow(tools.map((tool) => tool.key));

  const shown = tools.slice(0, visibleCount);
  while (shown.length && isSeparator(shown[shown.length - 1])) shown.pop();

  const hidden = tools
    .slice(visibleCount)
    .flatMap((tool) => (tool.overflow ? [tool.overflow] : []));

  return (
    <div ref={rowRef} className="flex flex-1 min-w-0 items-center gap-1 overflow-hidden py-1">
      {shown.map((tool) => (
        <div
          key={tool.key}
          {...{ [TOOLBAR_SLOT_ATTR]: tool.key }}
          className="flex flex-shrink-0 items-center"
        >
          {isSeparator(tool) ? <Separator /> : tool.node}
        </div>
      ))}
      <div {...{ [TOOLBAR_RESERVE_ATTR]: "" }} className="flex flex-shrink-0 items-center gap-1">
        {shown.length > 0 && <Separator />}
        {renderMore(hidden)}
      </div>
    </div>
  );
};
