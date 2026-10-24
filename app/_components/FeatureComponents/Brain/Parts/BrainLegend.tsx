"use client";

import { useTranslations } from "next-intl";
import { BrainEdgeKinds, BrainNodeKinds, LINK_EDGE_KINDS } from "@/app/_consts/relations";
import type { BrainGraph } from "@/app/_types/relations";
import { BrainPalette, edgeColour } from "../utils/brain-graph";

interface BrainLegendProps {
  graph: BrainGraph;
  palette: BrainPalette;
  shown: number;
  owner: string | null;
}

const SWATCHES = [
  BrainEdgeKinds.LINK,
  BrainEdgeKinds.MENTION,
  BrainEdgeKinds.CHECKLIST,
  BrainEdgeKinds.WIKI,
  BrainEdgeKinds.SUGGESTED,
  BrainEdgeKinds.TAG,
];

export const BrainLegend = ({ graph, palette, shown, owner }: BrainLegendProps) => {
  const t = useTranslations();
  const items = graph.nodes.filter(
    (node) =>
      node.kind === BrainNodeKinds.NOTE ||
      node.kind === BrainNodeKinds.CHECKLIST,
  ).length;
  const links = graph.edges.filter((edge) => LINK_EDGE_KINDS.has(edge.kind)).length;

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 hidden rounded-jotty border border-border bg-card px-3 py-2 text-md lg:block lg:text-xs text-muted-foreground">
      {owner && (
        <div className="font-medium text-foreground">
          {t("brain.viewingOwner", { owner })}
        </div>
      )}
      <div>{t("brain.summary", { items, links, shown })}</div>
      <div className="mt-1 flex flex-wrap gap-3">
        {SWATCHES.map((kind) => (
          <span key={kind} className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-4 rounded-full"
              style={{
                backgroundColor: edgeColour(
                  { source: "", target: "", kind, weight: 1 },
                  palette,
                  true,
                ),
              }}
            />
            {t(`brain.edges.${kind}`)}
          </span>
        ))}
      </div>
    </div>
  );
};
