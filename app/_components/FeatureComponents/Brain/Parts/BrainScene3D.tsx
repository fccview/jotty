"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D, { ForceGraphMethods, LinkObject, NodeObject } from "react-force-graph-3d";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BrainEdgeKinds } from "@/app/_consts/relations";
import type { BrainEdge, BrainNode } from "@/app/_types/relations";
import {
  endpointId,
  hex,
  isItemNode,
  neighbourMap,
  nodeRadius,
  nodeRgb,
  rgba,
  solidEdgeColour,
} from "../utils/brain-graph";
import {
  disposeParts,
  forgetStamps,
  LABEL_PIXEL_SHARE,
  NodeParts,
  nodeParts,
  PartColours,
  pickNode,
  recolourParts,
  tweenParts,
} from "../utils/brain-three";
import { BrainCanvasProps } from "../utils/brain-canvas";
import { useElementSize } from "../hooks/useElementSize";
import { collideForce, gravityForce, regionForce, spreadRadius } from "../utils/brain-forces";

type CanvasNode = NodeObject<BrainNode> & BrainNode;
type CanvasLink = LinkObject<BrainNode, BrainEdge> & BrainEdge;
type GraphRef = ForceGraphMethods<CanvasNode, CanvasLink>;

const TRANSPARENT = "rgba(0,0,0,0)";
const DOUBLE_CLICK_MS = 350;
const CLICK_SLOP_PX = 6;
const CLICK_MAX_MS = 450;
const PAN_MS = 700;
const FRAME_MS = 900;
const FOCUS_DISTANCE = 110;
const MIN_FRAME_DISTANCE = 140;
const MAX_FRAME_DISTANCE = 1600;
const FRAME_SCALE = 2.3;
const SAFE_ZONE = 0.28;
const IDLE_ROTATE_MS = 25_000;
const AUTO_ROTATE_SPEED = 0.35;
const HUB_LABEL_SHARE = 8;
const MAX_HUB_LABELS = 8;
const CHARGE = -150;
const CHARGE_REACH = 600;
const LINK_DISTANCE = 58;
const REGION_PULL = 0.05;
const GRAVITY = 0.008;
const PERSONAL_SPACE = 7;
const DECLUTTER_EVERY = 6;
const LABEL_GAP_PX = 4;

const noLabel = () => "";
const orbitProps = { controlType: "orbit" } as Record<string, unknown>;

/**
 * Render an interactive 3D graph of items and their relationships.
 * Manage camera movement, node highlighting and labels, and release scene resources on cleanup.
 */
export default function BrainScene3D({
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
  const partsRef = useRef(new Map<string, NodeParts>());
  const framedRef = useRef(false);
  const lastClickRef = useRef({ id: "", at: 0 });
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const [hoverId, setHoverId] = useState<string | null>(null);

  const graphData = useMemo(
    () => ({
      nodes: nodes.map((node) => ({ ...node })) as CanvasNode[],
      links: edges.map((edge) => ({ ...edge })) as CanvasLink[],
    }),
    [nodes, edges],
  );

  const neighbours = useMemo(() => neighbourMap(edges, true), [edges]);
  const hubs = useMemo(() => {
    const count = Math.min(MAX_HUB_LABELS, Math.ceil(nodes.length / HUB_LABEL_SHARE));
    return new Set(
      nodes
        .filter(isItemNode)
        .sort((a, b) => b.degree - a.degree)
        .slice(0, count)
        .map((node) => node.id),
    );
  }, [nodes]);

  const anchor = hoverId || selectedId || focusId;
  const lit = useMemo(
    () => (anchor ? new Set([anchor, ...Array.from(neighbours.get(anchor) || [])]) : null),
    [anchor, neighbours],
  );

  const aim = useCallback(
    (parts: NodeParts, id: string) => {
      const chosen = id === selectedId || id === focusId;
      const shown = !lit || lit.has(id);
      parts.target.body = shown ? 1 : 0.16;
      parts.target.ring = chosen ? 0.9 : id === hoverId ? 0.45 : 0;
      parts.target.label =
        shown && (chosen || id === hoverId || Boolean(lit) || hubs.has(id)) ? 1 : 0;
    },
    [selectedId, focusId, hoverId, lit, hubs],
  );
  const aimRef = useRef(aim);
  aimRef.current = aim;

  useEffect(() => {
    partsRef.current.forEach(aim);
  }, [aim]);

  const nodeByIdRef = useRef(new Map<string, CanvasNode>());
  nodeByIdRef.current = new Map(graphData.nodes.map((node) => [node.id, node]));
  const priorityRef = useRef<(id: string) => number>(() => 0);
  priorityRef.current = (id: string) => {
    if (id === hoverId) return 0;
    if (id === selectedId || id === focusId) return 1;
    return 2;
  };

  const declutter = useCallback(() => {
    const graph = graphRef.current;
    const container = containerRef.current;
    if (!graph || !container) return;
    const height = container.clientHeight * LABEL_PIXEL_SHARE;
    const wanted: { parts: NodeParts; node: CanvasNode; x: number; y: number }[] = [];

    partsRef.current.forEach((parts, id) => {
      const node = nodeByIdRef.current.get(id);
      if (!node || parts.target.label === 0 || node.x === undefined) {
        parts.crowded = false;
        return;
      }
      const screen = graph.graph2ScreenCoords(node.x || 0, node.y || 0, node.z || 0);
      wanted.push({ parts, node, x: screen.x, y: screen.y });
    });

    wanted.sort(
      (a, b) =>
        priorityRef.current(a.node.id) - priorityRef.current(b.node.id) ||
        b.node.degree - a.node.degree,
    );

    const taken: { left: number; right: number; top: number; bottom: number }[] = [];
    wanted.forEach(({ parts, x, y }) => {
      const width = height * parts.labelAspect;
      const box = {
        left: x - width / 2 - LABEL_GAP_PX,
        right: x + width / 2 + LABEL_GAP_PX,
        top: y - height * 1.6,
        bottom: y - height * 0.2,
      };
      parts.crowded = taken.some(
        (other) =>
          box.left < other.right && other.left < box.right && box.top < other.bottom && other.top < box.bottom,
      );
      if (!parts.crowded) taken.push(box);
    });
  }, [containerRef]);
  const declutterRef = useRef(declutter);
  declutterRef.current = declutter;

  useEffect(() => {
    let frame = 0;
    let tick = 0;
    const step = () => {
      tick = (tick + 1) % DECLUTTER_EVERY;
      if (tick === 0) declutterRef.current();
      partsRef.current.forEach(tweenParts);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    const parts = partsRef.current;
    return () => {
      cancelAnimationFrame(frame);
      parts.forEach(disposeParts);
      parts.clear();
      forgetStamps();
    };
  }, []);

  const controls = () => graphRef.current?.controls() as OrbitControls | undefined;

  const pauseRotation = useCallback(() => {
    const orbit = controls();
    if (orbit) orbit.autoRotate = false;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      const idle = controls();
      if (idle) idle.autoRotate = true;
    }, IDLE_ROTATE_MS);
  }, []);

  useEffect(() => {
    const orbit = controls();
    if (!orbit) return;
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.12;
    orbit.autoRotateSpeed = AUTO_ROTATE_SPEED;
    orbit.addEventListener("start", pauseRotation);
    return () => {
      orbit.removeEventListener("start", pauseRotation);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [size.width, pauseRotation]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.d3Force("charge")?.strength?.(CHARGE)?.distanceMax?.(CHARGE_REACH);
    graph.d3Force("link")?.distance?.(LINK_DISTANCE);
    graph.d3Force(
      "collide",
      collideForce((node) => nodeRadius(node, false) + PERSONAL_SPACE),
    );
    graph.d3Force("region", regionForce(REGION_PULL));
    graph.d3Force("gravity", gravityForce(GRAVITY));
  }, [size.width, graphData]);

  const focusCamera = useCallback(
    (id: string, closeUp: boolean) => {
      const graph = graphRef.current;
      const orbit = controls();
      const node = graphData.nodes.find((candidate) => candidate.id === id);
      if (!graph || !orbit || !node || node.x === undefined) return;

      const point = { x: node.x || 0, y: node.y || 0, z: node.z || 0 };
      const offset = graph.camera().position.clone().sub(orbit.target);

      if (closeUp) {
        offset.setLength(FOCUS_DISTANCE);
      } else {
        const screen = graph.graph2ScreenCoords(point.x, point.y, point.z);
        const dx = Math.abs(screen.x / size.width - 0.5);
        const dy = Math.abs(screen.y / size.height - 0.5);
        if (dx < SAFE_ZONE && dy < SAFE_ZONE) return;
      }

      pauseRotation();
      graph.cameraPosition(
        { x: point.x + offset.x, y: point.y + offset.y, z: point.z + offset.z },
        point,
        PAN_MS,
      );
    },
    [graphData.nodes, size.width, size.height, pauseRotation],
  );

  useEffect(() => {
    if (flyTo) focusCamera(flyTo.id, true);
  }, [flyTo, focusCamera]);

  const frameGraph = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const radius = spreadRadius(graphData.nodes);
    const distance = Math.min(
      MAX_FRAME_DISTANCE,
      Math.max(MIN_FRAME_DISTANCE, radius * FRAME_SCALE),
    );
    graph.cameraPosition({ x: 0, y: 0, z: distance }, { x: 0, y: 0, z: 0 }, FRAME_MS);
    const orbit = controls();
    if (orbit) orbit.autoRotate = true;
  }, [graphData.nodes]);

  const coloursFor = useCallback(
    (node: BrainNode): PartColours => ({
      body: hex(nodeRgb(node, colourMode, palette)),
      halo: rgba(palette.primary),
      edge: rgba(palette.background),
      mark: rgba(palette.background),
      ink: rgba(palette.foreground),
      paper: rgba(palette.card),
      border: rgba(palette.border),
    }),
    [colourMode, palette],
  );
  const coloursRef = useRef(coloursFor);
  coloursRef.current = coloursFor;
  const focusRef = useRef(focusId);
  focusRef.current = focusId;

  const buildNode = useCallback((raw: object) => {
    const node = raw as CanvasNode;
    const previous = partsRef.current.get(node.id);
    if (previous) disposeParts(previous);
    const parts = nodeParts(
      node,
      nodeRadius(node, node.id === focusRef.current),
      coloursRef.current(node),
    );
    aimRef.current(parts, node.id);
    partsRef.current.set(node.id, parts);
    return parts.group;
  }, []);

  useEffect(() => {
    const ids = new Set(graphData.nodes.map((node) => node.id));
    partsRef.current.forEach((parts, id) => {
      if (ids.has(id)) return;
      disposeParts(parts);
      partsRef.current.delete(id);
    });
  }, [graphData.nodes]);

  useEffect(() => {
    graphData.nodes.forEach((node) => {
      const parts = partsRef.current.get(node.id);
      if (parts) recolourParts(parts, node, coloursFor(node));
    });
  }, [coloursFor, graphData.nodes]);

  const touches = useCallback(
    (link: CanvasLink) =>
      Boolean(anchor) &&
      (endpointId(link.source) === anchor || endpointId(link.target) === anchor),
    [anchor],
  );

  const linkColour = useCallback(
    (link: object) => {
      const canvasLink = link as CanvasLink;
      if (!lit) return solidEdgeColour(canvasLink, palette, 0.35);
      return solidEdgeColour(canvasLink, palette, touches(canvasLink) ? 0 : 0.85);
    },
    [lit, palette, touches],
  );

  const linkWidth = useCallback(
    (link: object) => (touches(link as CanvasLink) ? 0.9 : 0),
    [touches],
  );

  const linkShown = useCallback(
    (link: object) => {
      const canvasLink = link as CanvasLink;
      return canvasLink.kind !== BrainEdgeKinds.SUGGESTED || touches(canvasLink);
    },
    [touches],
  );

  const particles = useCallback(
    (link: object) => {
      const canvasLink = link as CanvasLink;
      return touches(canvasLink) && canvasLink.kind !== BrainEdgeKinds.TAG ? 2 : 0;
    },
    [touches],
  );

  const particleColour = useCallback(() => rgba(palette.primary), [palette]);

  const pressRef = useRef<{ x: number; y: number; at: number } | null>(null);

  const handleClick = useCallback(
    (node: CanvasNode) => {
      const now = Date.now();
      const last = lastClickRef.current;
      lastClickRef.current = { id: node.id, at: now };
      if (last.id === node.id && now - last.at < DOUBLE_CLICK_MS) {
        onOpen(node);
        return;
      }
      onSelect(node.id);
      focusCamera(node.id, false);
    },
    [onOpen, onSelect, focusCamera],
  );

  const onPointerDown = (event: React.PointerEvent) => {
    pressRef.current = { x: event.clientX, y: event.clientY, at: Date.now() };
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const press = pressRef.current;
    pressRef.current = null;
    const graph = graphRef.current;
    const container = containerRef.current;
    if (!press || !graph || !container || event.button !== 0) return;
    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    if (moved > CLICK_SLOP_PX || Date.now() - press.at > CLICK_MAX_MS) return;

    const rect = container.getBoundingClientRect();
    const id = pickNode(
      partsRef.current,
      graph.camera(),
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const node = id ? graphData.nodes.find((candidate) => candidate.id === id) : null;
    if (node) handleClick(node);
    else onSelect(null);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onPointerDownCapture={onPointerDown}
      onPointerUpCapture={onPointerUp}
      onPointerMove={pauseRotation}
    >
      {size.width > 0 && (
        <ForceGraph3D
          {...orbitProps}
          ref={graphRef}
          width={size.width}
          height={size.height}
          graphData={graphData}
          backgroundColor={TRANSPARENT}
          showNavInfo={false}
          nodeId="id"
          nodeLabel={noLabel}
          nodeThreeObject={buildNode}
          linkColor={linkColour}
          linkOpacity={0.85}
          linkWidth={linkWidth}
          linkVisibility={linkShown}
          linkCurvature={(link) =>
            (link as CanvasLink).kind === BrainEdgeKinds.SUGGESTED ? 0.25 : 0
          }
          linkDirectionalParticles={particles}
          linkDirectionalParticleWidth={1.3}
          linkDirectionalParticleSpeed={0.006}
          linkDirectionalParticleColor={particleColour}
          enableNodeDrag={false}
          onNodeHover={(node) => {
            setHoverId((node as CanvasNode | null)?.id || null);
            if (node) pauseRotation();
          }}
          onNodeRightClick={(node) => onOpen(node as CanvasNode)}
          onEngineStop={() => {
            if (framedRef.current) return;
            framedRef.current = true;
            if (focusId) focusCamera(focusId, true);
            else frameGraph();
          }}
          warmupTicks={60}
          cooldownTicks={160}
        />
      )}
    </div>
  );
}
