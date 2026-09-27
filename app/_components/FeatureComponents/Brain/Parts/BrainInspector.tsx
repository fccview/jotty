"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckmarkSquare04Icon,
  File02Icon,
  FileAddIcon,
  Link01Icon,
  Tag01Icon,
  Cancel01Icon,
} from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { BrainEdgeKinds, BrainNodeKinds } from "@/app/_consts/relations";
import type { BrainEdge, BrainNode } from "@/app/_types/relations";

interface BrainInspectorProps {
  node: BrainNode | null;
  nodes: Map<string, BrainNode>;
  edges: BrainEdge[];
  canEdit: boolean;
  onPick: (id: string) => void;
  onOpen: (node: BrainNode) => void;
  onConnect: (source: BrainNode, target: BrainNode) => Promise<void>;
  onClose: () => void;
}

const KindIcon = ({ node }: { node: BrainNode }) => {
  if (node.kind === BrainNodeKinds.CHECKLIST)
    return <CheckmarkSquare04Icon className="h-4 w-4 shrink-0" />;
  if (node.kind === BrainNodeKinds.TAG)
    return <Tag01Icon className="h-4 w-4 shrink-0" />;
  if (node.kind === BrainNodeKinds.GHOST)
    return <FileAddIcon className="h-4 w-4 shrink-0" />;
  return <File02Icon className="h-4 w-4 shrink-0" />;
};

interface Neighbour {
  node: BrainNode;
  edge: BrainEdge;
  outgoing: boolean;
}

export const BrainInspector = ({
  node,
  nodes,
  edges,
  canEdit,
  onPick,
  onOpen,
  onConnect,
  onClose,
}: BrainInspectorProps) => {
  const t = useTranslations();
  const [connecting, setConnecting] = useState<string | null>(null);

  const neighbours = useMemo(() => {
    if (!node) return [] as Neighbour[];
    return edges
      .filter((edge) => edge.source === node.id || edge.target === node.id)
      .map((edge) => {
        const outgoing = edge.source === node.id;
        const other = nodes.get(outgoing ? edge.target : edge.source);
        return other ? { node: other, edge, outgoing } : null;
      })
      .filter((entry): entry is Neighbour => entry !== null);
  }, [node, nodes, edges]);

  if (!node) return null;

  const suggested = neighbours
    .filter((entry) => entry.edge.kind === BrainEdgeKinds.SUGGESTED)
    .sort((a, b) => b.edge.weight - a.edge.weight);
  const outgoing = neighbours.filter(
    (entry) => entry.outgoing && entry.edge.kind !== BrainEdgeKinds.SUGGESTED,
  );
  const incoming = neighbours.filter(
    (entry) => !entry.outgoing && entry.edge.kind !== BrainEdgeKinds.SUGGESTED,
  );
  const openable =
    node.kind === BrainNodeKinds.NOTE || node.kind === BrainNodeKinds.CHECKLIST;

  const connect = async (other: BrainNode) => {
    const [source, target] =
      node.kind === BrainNodeKinds.NOTE ? [node, other] : [other, node];
    setConnecting(other.id);
    try {
      await onConnect(source, target);
    } finally {
      setConnecting(null);
    }
  };

  const canConnect = (other: BrainNode) =>
    canEdit &&
    (node.kind === BrainNodeKinds.NOTE || other.kind === BrainNodeKinds.NOTE);

  const section = (title: string, entries: Neighbour[], action = false) =>
    entries.length === 0 ? null : (
      <div className="space-y-1.5">
        <div className="text-md lg:text-xs uppercase tracking-wide text-muted-foreground">
          {title} ({entries.length})
        </div>
        {entries.map(({ node: other, edge }) => (
          <div
            key={`${edge.kind}-${other.id}`}
            className="flex items-center gap-1.5"
          >
            <button
              type="button"
              onClick={() => onPick(other.id)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-jotty border border-border px-2.5 py-2 text-left text-md lg:text-sm transition-colors hover:bg-accent"
            >
              <KindIcon node={other} />
              <span className="min-w-0 truncate">{other.title}</span>
              {action && (
                <span className="ml-auto shrink-0 text-md lg:text-xs text-muted-foreground">
                  {Math.round(edge.weight * 100)}%
                </span>
              )}
            </button>
            {action && canConnect(other) && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={connecting === other.id}
                onClick={() => connect(other)}
                title={t("brain.promote", { title: other.title })}
                aria-label={t("brain.promote", { title: other.title })}
              >
                <Link01Icon className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    );

  return (
    <aside className="flex max-h-full flex-col gap-4 overflow-y-auto rounded-jotty border border-border bg-card p-4 jotty-scrollable-content">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-md lg:text-xs uppercase tracking-wide text-muted-foreground">
            <KindIcon node={node} />
            {t(`brain.kind.${node.kind}`)}
          </div>
          <h2 className="break-words text-lg font-semibold text-foreground">
            {node.title}
          </h2>
          {node.category && (
            <p className="text-md lg:text-sm text-muted-foreground">
              {node.category}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <Cancel01Icon className="h-4 w-4" />
        </Button>
      </div>

      {section(t("brain.linksTo"), outgoing)}
      {section(t("brain.linkedFrom"), incoming)}
      {section(t("brain.suggested"), suggested, true)}

      {neighbours.length === 0 && (
        <p className="text-md lg:text-sm text-muted-foreground">
          {t("brain.lonely")}
        </p>
      )}

      <Button onClick={() => onOpen(node)} className="w-full">
        {openable
          ? t("brain.open")
          : node.kind === BrainNodeKinds.GHOST
            ? t("brain.createGhost")
            : t("brain.openTag")}
      </Button>
    </aside>
  );
};
