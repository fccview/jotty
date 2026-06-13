"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import ForceGraph2D, {
  ForceGraphMethods,
  LinkObject,
  NodeObject,
} from "react-force-graph-2d";
import { useRouter } from "next/navigation";
import { CheckmarkSquare04Icon, File02Icon } from "hugeicons-react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { ItemTypes } from "@/app/_types/enums";
import {
  ConnectionGraphData,
  ConnectionGraphLink,
  ConnectionGraphNode,
} from "./graph-data";

interface ConnectionsGraphProps {
  graphData: ConnectionGraphData;
  selectedNodeId: string | null;
  onSelectedNodeChange: (nodeId: string | null) => void;
  showLabels: boolean;
  showArrows: boolean;
  nodeScale: number;
  linkWidth: number;
  linkDistance: number;
  repelForce: number;
  labels: ConnectionsGraphLabels;
}

export interface ConnectionsGraphLabels {
  unknown: string;
  total: string;
  inbound: string;
  outbound: string;
  updated: string;
  uuid: string;
  openItem: string;
  selectItem: string;
  inspectHint: string;
  linkedItems: string;
}

type CanvasNode = NodeObject<ConnectionGraphNode> & ConnectionGraphNode;
type CanvasLink = LinkObject<ConnectionGraphNode, ConnectionGraphLink> &
  ConnectionGraphLink;
type GraphRef = ForceGraphMethods<
  NodeObject<ConnectionGraphNode>,
  LinkObject<ConnectionGraphNode, ConnectionGraphLink>
>;
type LabelHitBox = {
  node: CanvasNode;
  left: number;
  right: number;
  top: number;
  bottom: number;
};
type AxisForce = ((alpha: number) => void) & {
  initialize: (nodes: CanvasNode[]) => void;
};

const TYPE_COLORS: Record<string, string> = {
  [ItemTypes.NOTE]: "#3b82f6",
  [ItemTypes.CHECKLIST]: "#10b981",
};

const getLinkId = (
  value: string | number | NodeObject<ConnectionGraphNode> | undefined,
) => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return value?.id ? String(value.id) : "";
};

const MIN_POINTER_RADIUS = 24;
const COARSE_POINTER_RADIUS = 36;
const CLICK_MOVE_TOLERANCE = 10;
const LONG_RANGE_REPEL_FACTOR = 4;
const MIN_REPEL_DISTANCE_MAX = 260;
const CENTER_PULL_STRENGTH = 0.035;

const getNodeRadius = (node: ConnectionGraphNode, scale: number) =>
  Math.max(4, Math.min(18, 4 + node.connectionCount * 1.1)) * scale;

const createAxisForce = (
  axis: "x" | "y",
  strength: number,
): AxisForce => {
  let nodes: CanvasNode[] = [];
  const velocity = axis === "x" ? "vx" : "vy";

  const force = ((alpha: number) => {
    nodes.forEach((node) => {
      const position = node[axis] || 0;
      node[velocity] = (node[velocity] || 0) + (0 - position) * strength * alpha;
    });
  }) as AxisForce;

  force.initialize = (nextNodes: CanvasNode[]) => {
    nodes = nextNodes;
  };

  return force;
};

const formatDate = (value: string) => {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

export const ConnectionsGraph = ({
  graphData,
  selectedNodeId,
  onSelectedNodeChange,
  showLabels,
  showArrows,
  nodeScale,
  linkWidth,
  linkDistance,
  repelForce,
  labels,
}: ConnectionsGraphProps) => {
  const graphRef = useRef<GraphRef | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasFitGraphRef = useRef(false);
  const labelHitBoxesRef = useRef<LabelHitBox[]>([]);
  const pointerDownRef = useRef<{ x: number; y: number; pointerId: number } | null>(
    null,
  );
  const router = useRouter();
  const [dimensions, setDimensions] = useState({ width: 900, height: 620 });
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);

  const selectedNode = useMemo(
    () => graphData.nodes.find((node) => node.id === selectedNodeId) || null,
    [graphData.nodes, selectedNodeId],
  );
  const inspectedNode = selectedNode;
  const nodeById = useMemo(
    () => new Map(graphData.nodes.map((node) => [node.id, node])),
    [graphData.nodes],
  );
  const linkedNodes = useMemo(() => {
    if (!inspectedNode) return [];

    const seen = new Set<string>();
    return graphData.links
      .flatMap((link) => {
        if (link.source === inspectedNode.id) return [link.target];
        if (link.target === inspectedNode.id) return [link.source];
        return [];
      })
      .filter((nodeId) => {
        if (seen.has(nodeId)) return false;
        seen.add(nodeId);
        return true;
      })
      .map((nodeId) => nodeById.get(nodeId))
      .filter((node): node is ConnectionGraphNode => Boolean(node))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [graphData.links, inspectedNode, nodeById]);
  const canvasGraphData = useMemo(
    () => ({
      nodes: graphData.nodes.map((node) => ({ ...node })),
      links: graphData.links.map((link) => ({ ...link })),
    }),
    [graphData],
  );

  const neighborIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const ids = new Set<string>([selectedNodeId]);
    graphData.links.forEach((link) => {
      if (link.source === selectedNodeId) ids.add(link.target);
      if (link.target === selectedNodeId) ids.add(link.source);
    });
    return ids;
  }, [graphData.links, selectedNodeId]);

  useEffect(() => {
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const updatePointerMode = () => setIsCoarsePointer(coarsePointerQuery.matches);

    updatePointerMode();
    coarsePointerQuery.addEventListener("change", updatePointerMode);
    return () => coarsePointerQuery.removeEventListener("change", updatePointerMode);
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({
        width: Math.max(320, Math.round(rect.width)),
        height: Math.max(420, Math.round(rect.height)),
      });
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const chargeForce = graphRef.current?.d3Force("charge");
    chargeForce?.strength(-repelForce);
    chargeForce?.distanceMax?.(
      Math.max(MIN_REPEL_DISTANCE_MAX, linkDistance * LONG_RANGE_REPEL_FACTOR),
    );
    graphRef.current?.d3Force("link")?.distance(linkDistance);
    graphRef.current?.d3Force("x", createAxisForce("x", CENTER_PULL_STRENGTH));
    graphRef.current?.d3Force("y", createAxisForce("y", CENTER_PULL_STRENGTH));
    graphRef.current?.d3ReheatSimulation();
    hasFitGraphRef.current = false;
  }, [linkDistance, repelForce]);

  useEffect(() => {
    graphRef.current?.d3ReheatSimulation();
    hasFitGraphRef.current = false;
  }, [graphData.nodes.length, graphData.links.length]);

  const focusNode = (node: CanvasNode) => {
    onSelectedNodeChange(node.id);
    if (node.x !== undefined && node.y !== undefined) {
      graphRef.current?.centerAt(node.x, node.y, 650);
      graphRef.current?.zoom(2.4, 650);
    }
  };

  const openNode = (node: ConnectionGraphNode) => {
    router.push(node.url);
  };

  const findNodeAtPointer = (clientX: number, clientY: number) => {
    const graph = graphRef.current;
    const container = containerRef.current;
    if (!graph || !container) return null;

    const rect = container.getBoundingClientRect();
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;
    const zoom = Math.max(0.001, graph.zoom());
    const minimumRadius = isCoarsePointer
      ? COARSE_POINTER_RADIUS
      : MIN_POINTER_RADIUS;
    const graphPosition = graph.screen2GraphCoords(pointerX, pointerY);

    const labelHit = labelHitBoxesRef.current.find(
      (box) =>
        graphPosition.x >= box.left &&
        graphPosition.x <= box.right &&
        graphPosition.y >= box.top &&
        graphPosition.y <= box.bottom,
    );
    if (labelHit) return labelHit.node;

    let closestNode: CanvasNode | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    canvasGraphData.nodes.forEach((node) => {
      const canvasNode = node as CanvasNode;
      if (canvasNode.x === undefined || canvasNode.y === undefined) return;

      const screenPosition = graph.graph2ScreenCoords(
        canvasNode.x,
        canvasNode.y,
      );
      const distance = Math.hypot(
        screenPosition.x - pointerX,
        screenPosition.y - pointerY,
      );
      const hitRadius = Math.max(
        minimumRadius,
        getNodeRadius(canvasNode, nodeScale) * zoom,
      );

      if (distance <= hitRadius && distance < closestDistance) {
        closestNode = canvasNode;
        closestDistance = distance;
      }
    });

    return closestNode;
  };

  const handlePointerDownCapture = (event: PointerEvent<HTMLDivElement>) => {
    pointerDownRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    };
  };

  const handlePointerUpCapture = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!start || start.pointerId !== event.pointerId) return;

    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (moved > CLICK_MOVE_TOLERANCE) return;

    const node = findNodeAtPointer(event.clientX, event.clientY);
    if (!node) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.detail >= 2) {
      openNode(node);
      return;
    }

    focusNode(node);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div
        ref={containerRef}
        onPointerDownCapture={handlePointerDownCapture}
        onPointerUpCapture={handlePointerUpCapture}
        className="h-[62vh] min-h-[460px] overflow-hidden rounded-md border border-border bg-card"
      >
        <ForceGraph2D
          ref={graphRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={canvasGraphData}
          nodeId="id"
          linkDirectionalArrowLength={(link) =>
            showArrows && (link as CanvasLink).type === "explicit" ? 5 : 0
          }
          linkDirectionalArrowRelPos={1}
          linkWidth={(link) => {
            const canvasLink = link as CanvasLink;
            const sourceId = getLinkId(canvasLink.source);
            const targetId = getLinkId(canvasLink.target);
            const highlighted =
              !selectedNodeId ||
              sourceId === selectedNodeId ||
              targetId === selectedNodeId;
            return highlighted
              ? canvasLink.type === "tag"
                ? Math.max(0.5, linkWidth * 0.7)
                : linkWidth
              : Math.max(0.5, linkWidth * 0.5);
          }}
          linkColor={(link) => {
            const canvasLink = link as CanvasLink;
            const sourceId = getLinkId(canvasLink.source);
            const targetId = getLinkId(canvasLink.target);
            if (
              !selectedNodeId ||
              sourceId === selectedNodeId ||
              targetId === selectedNodeId
            ) {
              return canvasLink.type === "tag"
                ? "rgba(244,114,182,0.46)"
                : "rgba(148,163,184,0.7)";
            }
            return "rgba(148,163,184,0.18)";
          }}
          nodeRelSize={nodeScale}
          nodeVal={(node) =>
            Math.max(1.8, Math.min(9, 2 + (node as CanvasNode).weight))
          }
          nodeCanvasObject={(node, ctx, globalScale) => {
            const canvasNode = node as CanvasNode;
            const baseColor = TYPE_COLORS[canvasNode.type] || TYPE_COLORS[ItemTypes.NOTE];
            const radius = getNodeRadius(canvasNode, nodeScale);
            const isSelected = selectedNodeId === canvasNode.id;
            const isNeighbor = neighborIds.has(canvasNode.id);
            const dimmed = selectedNodeId && !isNeighbor;

            ctx.beginPath();
            ctx.arc(canvasNode.x || 0, canvasNode.y || 0, radius, 0, 2 * Math.PI);
            ctx.fillStyle = dimmed ? "rgba(148,163,184,0.35)" : baseColor;
            ctx.fill();

            if (isSelected) {
              ctx.lineWidth = 3 / globalScale;
              ctx.strokeStyle = "#f8fafc";
              ctx.stroke();
            }

          }}
          onRenderFramePost={(ctx, globalScale) => {
            labelHitBoxesRef.current = [];
            if (!showLabels && !selectedNodeId) return;

            const boxes: LabelHitBox[] = [];
            const fontSize = Math.max(10, 13 / globalScale);
            const paddingX = 4 / globalScale;
            const paddingY = 3 / globalScale;
            const gap = 6 / globalScale;
            const sortedNodes = [...canvasGraphData.nodes].sort((a, b) => {
              if (a.id === selectedNodeId) return -1;
              if (b.id === selectedNodeId) return 1;
              return b.connectionCount - a.connectionCount;
            });

            ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";

            sortedNodes.forEach((node) => {
              const canvasNode = node as CanvasNode;
              if (canvasNode.x === undefined || canvasNode.y === undefined) return;

              const isPriority = canvasNode.id === selectedNodeId;
              if (!showLabels && !isPriority) return;

              const radius = getNodeRadius(canvasNode, nodeScale);
              const label = canvasNode.label.slice(0, 34);
              const textWidth = ctx.measureText(label).width;
              const x = canvasNode.x + radius + gap;
              const y = canvasNode.y;
              const box = {
                left: x - paddingX,
                right: x + textWidth + paddingX,
                top: y - fontSize / 2 - paddingY,
                bottom: y + fontSize / 2 + paddingY,
              };
              const overlaps = boxes.some(
                (existing) =>
                  box.left < existing.right &&
                  box.right > existing.left &&
                  box.top < existing.bottom &&
                  box.bottom > existing.top,
              );

              if (overlaps && !isPriority) return;

              const hitBox = { ...box, node: canvasNode };
              boxes.push(hitBox);
              labelHitBoxesRef.current.push(hitBox);
              ctx.fillStyle = "rgba(15,23,42,0.92)";
              ctx.fillText(label, x, y);
            });
          }}
          nodePointerAreaPaint={(node, color, ctx, globalScale) => {
            const canvasNode = node as CanvasNode;
            const radius = Math.max(
              MIN_POINTER_RADIUS / globalScale,
              getNodeRadius(canvasNode, nodeScale),
            );
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(canvasNode.x || 0, canvasNode.y || 0, radius, 0, 2 * Math.PI);
            ctx.fill();
          }}
          onNodeClick={(node, event) => {
            if (event.detail >= 2) {
              openNode(node as ConnectionGraphNode);
              return;
            }
            focusNode(node as CanvasNode);
          }}
          onNodeRightClick={(node) => openNode(node as ConnectionGraphNode)}
          onBackgroundClick={() => onSelectedNodeChange(null)}
          onNodeDragEnd={(node) => {
            node.fx = node.x;
            node.fy = node.y;
            graphRef.current?.pauseAnimation();
          }}
          onEngineStop={() => {
            if (!hasFitGraphRef.current) {
              graphRef.current?.zoomToFit(450, 40);
              hasFitGraphRef.current = true;
            }
            graphRef.current?.pauseAnimation();
          }}
          cooldownTicks={70}
          cooldownTime={2500}
          d3AlphaDecay={0.08}
          enableNodeDrag={!isCoarsePointer}
        />
      </div>

      <aside className="rounded-md border border-border bg-card p-4">
        {inspectedNode ? (
          <div className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {inspectedNode.type}
              </div>
              <h3 className="break-words text-lg font-semibold">
                {inspectedNode.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {inspectedNode.category}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-secondary p-2">
                <div className="text-lg font-semibold">
                  {inspectedNode.connectionCount}
                </div>
                <div className="text-xs text-muted-foreground">{labels.total}</div>
              </div>
              <div className="rounded-md bg-secondary p-2">
                <div className="text-lg font-semibold">
                  {inspectedNode.inboundCount}
                </div>
                <div className="text-xs text-muted-foreground">{labels.inbound}</div>
              </div>
              <div className="rounded-md bg-secondary p-2">
                <div className="text-lg font-semibold">
                  {inspectedNode.outboundCount}
                </div>
                <div className="text-xs text-muted-foreground">{labels.outbound}</div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{labels.updated}</span>
                <span>{inspectedNode.updatedAt ? formatDate(inspectedNode.updatedAt) : labels.unknown}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{labels.uuid}</span>
                <span className="truncate font-mono text-xs">{inspectedNode.id}</span>
              </div>
            </div>

            {inspectedNode.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {inspectedNode.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-jotty bg-secondary px-2 py-1 text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {linkedNodes.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">{labels.linkedItems}</div>
                <div className="max-h-48 space-y-1.5 overflow-y-auto pr-2">
                  {linkedNodes.map((node) => {
                    const Icon =
                      node.type === ItemTypes.CHECKLIST
                        ? CheckmarkSquare04Icon
                        : File02Icon;

                    return (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => openNode(node)}
                        className="flex w-full items-center gap-2 rounded-jotty border border-border px-2.5 py-2 text-left text-sm transition-colors hover:bg-secondary"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 truncate">{node.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button onClick={() => openNode(inspectedNode)} className="w-full">
              {labels.openItem}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-muted-foreground">
            <h3 className="text-base font-semibold text-foreground">
              {labels.selectItem}
            </h3>
            <p>{labels.inspectHint}</p>
          </div>
        )}
      </aside>
    </div>
  );
};
