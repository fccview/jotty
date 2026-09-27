"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, {
  ForceGraphMethods,
  LinkObject,
  NodeObject,
} from "react-force-graph-2d";
import { BrainEdgeKinds, BrainNodeKinds } from "@/app/_consts/relations";
import type { BrainEdge, BrainNode } from "@/app/_types/relations";
import {
  edgeColour,
  endpointId,
  isItemNode,
  neighbourMap,
  nodeColour,
  nodeRadius,
  rgba,
} from "../utils/brain-graph";
import { BrainCanvasProps, FLY_MS } from "../utils/brain-canvas";
import { useElementSize } from "../hooks/useElementSize";
import { collideForce, gravityForce, regionForce } from "../utils/brain-forces";
import { paintHalo, paintStamp } from "../utils/brain-glyphs";

type CanvasNode = NodeObject<BrainNode> & BrainNode;
type CanvasLink = LinkObject<BrainNode, BrainEdge> & BrainEdge;
type GraphRef = ForceGraphMethods<CanvasNode, CanvasLink>;

const FOCUS_ZOOM = 3;
const CLICK_SLOP_PX = 6;
const CLICK_MAX_MS = 450;
const DOUBLE_CLICK_MS = 350;
const REGION_PULL = 0.05;
const GRAVITY = 0.012;
const CHARGE = -110;
const CHARGE_REACH = 500;
const LINK_DISTANCE = 42;
const PERSONAL_SPACE = 5;
const LABEL_MAX_CHARS = 28;
const LABEL_FONT_PX = 12;
const LABEL_PAD_PX = 5;
const HUB_LABELS = 10;
const GLYPH_MIN_PX = 7;
const DIM_ALPHA = 0.15;
const FIT_PADDING = 120;
const STAMP_SCALE = 1.05;

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const _overlaps = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

const _clip = (title: string) =>
  title.length > LABEL_MAX_CHARS ? `${title.slice(0, LABEL_MAX_CHARS - 1)}…` : title;

export default function BrainCanvas2D({
  nodes,
  edges,
  focusId,
  selectedId,
  colourMode,
  palette,
  flyTo,
  onSelect,
  onOpen,
}: BrainCanvasProps) {
  const graphRef = useRef<GraphRef | undefined>(undefined);
  const settledRef = useRef(false);
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hoverRef = useRef<CanvasNode | null>(null);
  const pressRef = useRef<{ x: number; y: number; at: number } | null>(null);
  const lastClickRef = useRef({ id: "", at: 0 });

  const graphData = useMemo(
    () => ({
      nodes: nodes.map((node) => ({ ...node })) as CanvasNode[],
      links: edges.map((edge) => ({ ...edge })) as CanvasLink[],
    }),
    [nodes, edges],
  );

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.d3Force("charge")?.strength?.(CHARGE)?.distanceMax?.(CHARGE_REACH);
    graph.d3Force("link")?.distance?.(LINK_DISTANCE);
    graph.d3Force("collide", collideForce((node) => nodeRadius(node, false) + PERSONAL_SPACE));
    graph.d3Force("region", regionForce(REGION_PULL));
    graph.d3Force("gravity", gravityForce(GRAVITY));
  }, [size.width, graphData]);

  const nodeAt = (event: React.PointerEvent): CanvasNode | null => {
    const graph = graphRef.current;
    const container = containerRef.current;
    if (!graph || !container) return null;
    const rect = container.getBoundingClientRect();
    const point = graph.screen2GraphCoords(event.clientX - rect.left, event.clientY - rect.top);
    let best: CanvasNode | null = null;
    let bestDistance = Infinity;
    graphData.nodes.forEach((candidate) => {
      const distance = Math.hypot((candidate.x || 0) - point.x, (candidate.y || 0) - point.y);
      const reach = Math.max(6, nodeRadius(candidate, false)) * 1.4;
      if (distance <= reach && distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    });
    return best;
  };

  const onPointerDown = (event: React.PointerEvent) => {
    pressRef.current = { x: event.clientX, y: event.clientY, at: Date.now() };
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const press = pressRef.current;
    pressRef.current = null;
    if (!press || event.button !== 0) return;
    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    if (moved > CLICK_SLOP_PX || Date.now() - press.at > CLICK_MAX_MS) return;

    const node = hoverRef.current || nodeAt(event);
    if (!node) {
      onSelect(null);
      return;
    }
    const now = Date.now();
    const last = lastClickRef.current;
    lastClickRef.current = { id: node.id, at: now };
    if (last.id === node.id && now - last.at < DOUBLE_CLICK_MS) onOpen(node);
    else onSelect(node.id);
  };

  const neighbours = useMemo(() => neighbourMap(edges, true), [edges]);
  const hubs = useMemo(
    () =>
      new Set(
        [...nodes]
          .filter(isItemNode)
          .sort((a, b) => b.degree - a.degree)
          .slice(0, HUB_LABELS)
          .map((node) => node.id),
      ),
    [nodes],
  );

  const anchor = hoverId || selectedId || focusId;
  const lit = useMemo(
    () =>
      anchor
        ? new Set([anchor, ...Array.from(neighbours.get(anchor) || [])])
        : null,
    [anchor, neighbours],
  );

  const centreOn = useCallback(
    (id: string) => {
      const node = graphData.nodes.find((candidate) => candidate.id === id);
      if (!node || node.x === undefined || node.y === undefined) return;
      graphRef.current?.centerAt(node.x, node.y, FLY_MS);
      graphRef.current?.zoom(FOCUS_ZOOM, FLY_MS);
    },
    [graphData.nodes],
  );

  useEffect(() => {
    if (flyTo) centreOn(flyTo.id);
  }, [flyTo, centreOn]);

  const isLitLink = useCallback(
    (link: CanvasLink) =>
      !lit ||
      (lit.has(endpointId(link.source)) && lit.has(endpointId(link.target))),
    [lit],
  );

  const drawNode = useCallback(
    (raw: object, ctx: CanvasRenderingContext2D, scale: number) => {
      const node = raw as CanvasNode;
      const isAnchor = node.id === focusId || node.id === selectedId;
      const radius = nodeRadius(node, node.id === focusId) * STAMP_SCALE;
      const x = node.x || 0;
      const y = node.y || 0;

      ctx.globalAlpha = !lit || lit.has(node.id) ? 1 : DIM_ALPHA;
      if (isAnchor || node.id === hoverId) {
        paintHalo(
          ctx,
          x,
          y,
          radius * 1.55,
          rgba(palette.primary, isAnchor ? 1 : 0.55),
          Math.max(1.2 / scale, radius * 0.14),
        );
      }
      paintStamp(
        ctx,
        node,
        x,
        y,
        radius,
        {
          fill: nodeColour(node, colourMode, palette),
          edge: rgba(palette.background),
          mark: rgba(palette.background),
        },
        radius * scale >= GLYPH_MIN_PX,
      );
      ctx.globalAlpha = 1;
    },
    [focusId, selectedId, hoverId, lit, colourMode, palette],
  );

  const labelOrder = useMemo(() => {
    const rank = (node: CanvasNode) => {
      if (node.id === hoverId) return 0;
      if (node.id === selectedId || node.id === focusId) return 1;
      if (lit?.has(node.id)) return 2;
      if (!lit && hubs.has(node.id)) return 3;
      return -1;
    };
    return graphData.nodes
      .map((node) => ({ node, rank: rank(node) }))
      .filter((entry) => entry.rank >= 0)
      .sort((a, b) => a.rank - b.rank || b.node.degree - a.node.degree)
      .map((entry) => entry.node);
  }, [graphData.nodes, hoverId, selectedId, focusId, lit, hubs]);

  const drawLabels = useCallback(
    (ctx: CanvasRenderingContext2D, scale: number) => {
      const taken: Box[] = [];
      const font = LABEL_FONT_PX / scale;
      const pad = LABEL_PAD_PX / scale;
      ctx.font = `600 ${font}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      labelOrder.forEach((node) => {
        const text = _clip(node.title);
        const width = ctx.measureText(text).width + pad * 2;
        const height = font + pad * 1.4;
        const x = node.x || 0;
        const top = (node.y || 0) + nodeRadius(node, node.id === focusId) * STAMP_SCALE * 1.7 + 2 / scale;
        const box = { left: x - width / 2, top, right: x + width / 2, bottom: top + height };
        if (taken.some((other) => _overlaps(box, other))) return;
        taken.push(box);

        ctx.beginPath();
        ctx.roundRect(box.left, box.top, width, height, height / 2);
        ctx.fillStyle = rgba(palette.card);
        ctx.fill();
        ctx.lineWidth = 1 / scale;
        ctx.strokeStyle = rgba(palette.border);
        ctx.stroke();
        ctx.fillStyle = rgba(palette.foreground);
        ctx.fillText(text, x, box.top + height / 2);
      });
    },
    [labelOrder, focusId, palette],
  );

  const paintHitArea = useCallback(
    (raw: object, colour: string, ctx: CanvasRenderingContext2D) => {
      const node = raw as CanvasNode;
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(
        node.x || 0,
        node.y || 0,
        Math.max(6, nodeRadius(node, false)),
        0,
        2 * Math.PI,
      );
      ctx.fill();
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onPointerDownCapture={onPointerDown}
      onPointerUpCapture={onPointerUp}
    >
      {size.width > 0 && (
        <ForceGraph2D
          ref={graphRef}
          width={size.width}
          height={size.height}
          graphData={graphData}
          nodeId="id"
          nodeLabel={() => ""}
          nodeCanvasObject={drawNode}
          onRenderFramePost={drawLabels}
          nodePointerAreaPaint={paintHitArea}
          linkColor={(link) =>
            edgeColour(
              link as CanvasLink,
              palette,
              isLitLink(link as CanvasLink),
            )
          }
          linkWidth={(link) =>
            lit && isLitLink(link as CanvasLink) ? 1.6 : 0.6
          }
          linkVisibility={(link) => {
            const canvasLink = link as CanvasLink;
            if (canvasLink.kind !== BrainEdgeKinds.SUGGESTED) return true;
            return Boolean(anchor) &&
              (endpointId(canvasLink.source) === anchor || endpointId(canvasLink.target) === anchor);
          }}
          linkLineDash={(link) =>
            (link as CanvasLink).kind === BrainEdgeKinds.SUGGESTED
              ? [3, 3]
              : null
          }
          linkDirectionalParticles={(link) =>
            lit &&
            isLitLink(link as CanvasLink) &&
            (link as CanvasLink).kind !== BrainEdgeKinds.TAG
              ? 3
              : 0
          }
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={() => rgba(palette.primary, 0.95)}
          onNodeHover={(node) => {
            hoverRef.current = (node as CanvasNode | null) || null;
            setHoverId(hoverRef.current?.id || null);
          }}
          onNodeRightClick={(node) => onOpen(node as CanvasNode)}
          onEngineStop={() => {
            if (settledRef.current) return;
            settledRef.current = true;
            if (focusId) centreOn(focusId);
            else graphRef.current?.zoomToFit(600, FIT_PADDING);
          }}
          cooldownTicks={120}
        />
      )}
    </div>
  );
}
