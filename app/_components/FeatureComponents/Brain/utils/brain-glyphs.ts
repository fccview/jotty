import type { ReactElement } from "react";
import {
  CheckmarkSquare04Icon,
  File02Icon,
  FileAddIcon,
  Tag01Icon,
  TaskDaily01Icon,
} from "hugeicons-react";
import { BrainNodeKinds } from "@/app/_consts/relations";
import { isKanbanType } from "@/app/_types/enums";
import type { BrainNode } from "@/app/_types/relations";

export enum NodeShapes {
  DISC = "disc",
  TILE = "tile",
  GEM = "gem",
  HOLLOW = "hollow",
}

export enum NodeGlyphs {
  PAGE = "page",
  TICK = "tick",
  COLUMNS = "columns",
  HASH = "hash",
  PLUS = "plus",
}

export interface StampInk {
  fill: string;
  edge: string;
  mark: string;
}

const EDGE_SHARE = 0.16;
const TILE_CORNER = 0.34;
const ICON_SHARE = 1.3;

export const shapeOf = (node: BrainNode): NodeShapes => {
  if (node.kind === BrainNodeKinds.GHOST) return NodeShapes.HOLLOW;
  if (node.kind === BrainNodeKinds.TAG) return NodeShapes.GEM;
  if (node.kind === BrainNodeKinds.CHECKLIST) return NodeShapes.TILE;
  return NodeShapes.DISC;
};

export const glyphOf = (node: BrainNode): NodeGlyphs => {
  if (node.kind === BrainNodeKinds.GHOST) return NodeGlyphs.PLUS;
  if (node.kind === BrainNodeKinds.TAG) return NodeGlyphs.HASH;
  if (node.kind === BrainNodeKinds.CHECKLIST) {
    return isKanbanType(node.checklistType) ? NodeGlyphs.COLUMNS : NodeGlyphs.TICK;
  }
  return NodeGlyphs.PAGE;
};

export const stampKey = (node: BrainNode, ink: StampInk): string =>
  [shapeOf(node), glyphOf(node), ink.fill, ink.edge, ink.mark].join("|");

const _roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, corner: number) => {
  const half = size / 2;
  ctx.beginPath();
  ctx.moveTo(x - half + corner, y - half);
  ctx.arcTo(x + half, y - half, x + half, y + half, corner);
  ctx.arcTo(x + half, y + half, x - half, y + half, corner);
  ctx.arcTo(x - half, y + half, x - half, y - half, corner);
  ctx.arcTo(x - half, y - half, x + half, y - half, corner);
  ctx.closePath();
};

const _outline = (ctx: CanvasRenderingContext2D, shape: NodeShapes, x: number, y: number, r: number) => {
  if (shape === NodeShapes.TILE) {
    _roundRect(ctx, x, y, r * 1.8, r * TILE_CORNER * 1.8);
    return;
  }
  if (shape === NodeShapes.GEM) {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    return;
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
};

type IconChild = ReactElement<{ d?: string }> | IconChild[] | null | undefined;

type IconRender = {
  render: (props: object, ref: null) => ReactElement<{ children?: IconChild }>;
};

const _flatten = (child: IconChild): ReactElement<{ d?: string }>[] =>
  Array.isArray(child) ? child.flatMap(_flatten) : child ? [child] : [];

const GLYPH_ICONS: Record<NodeGlyphs, unknown> = {
  [NodeGlyphs.PAGE]: File02Icon,
  [NodeGlyphs.TICK]: CheckmarkSquare04Icon,
  [NodeGlyphs.COLUMNS]: TaskDaily01Icon,
  [NodeGlyphs.HASH]: Tag01Icon,
  [NodeGlyphs.PLUS]: FileAddIcon,
};

const ICON_BOX = 24;
const ICON_STROKE = 1.9;
const iconPaths = new Map<NodeGlyphs, Path2D[]>();

const _pathsOf = (glyph: NodeGlyphs): Path2D[] => {
  const cached = iconPaths.get(glyph);
  if (cached) return cached;
  const svg = (GLYPH_ICONS[glyph] as IconRender).render({}, null);
  const paths = _flatten(svg.props.children)
    .map((child) => child.props.d)
    .filter((d): d is string => Boolean(d))
    .map((d) => new Path2D(d));
  iconPaths.set(glyph, paths);
  return paths;
};

const _glyph = (ctx: CanvasRenderingContext2D, glyph: NodeGlyphs, x: number, y: number, size: number) => {
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / ICON_BOX, size / ICON_BOX);
  ctx.lineWidth = ICON_STROKE;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  _pathsOf(glyph).forEach((path) => ctx.stroke(path));
  ctx.restore();
};

export const paintStamp = (
  ctx: CanvasRenderingContext2D,
  node: BrainNode,
  x: number,
  y: number,
  r: number,
  ink: StampInk,
  withGlyph = true,
) => {
  const shape = shapeOf(node);
  const edge = r * EDGE_SHARE;

  if (shape === NodeShapes.HOLLOW) {
    _outline(ctx, NodeShapes.DISC, x, y, r + edge / 2);
    ctx.fillStyle = ink.edge;
    ctx.fill();
    _outline(ctx, NodeShapes.DISC, x, y, r - edge / 2);
    ctx.setLineDash([r * 0.45, r * 0.3]);
    ctx.lineWidth = edge;
    ctx.strokeStyle = ink.fill;
    ctx.stroke();
    ctx.setLineDash([]);
    if (withGlyph) {
      ctx.strokeStyle = ink.fill;
      _glyph(ctx, NodeGlyphs.PLUS, x, y, r * ICON_SHARE);
    }
    return;
  }

  _outline(ctx, shape, x, y, r + edge);
  ctx.fillStyle = ink.edge;
  ctx.fill();
  _outline(ctx, shape, x, y, r);
  ctx.fillStyle = ink.fill;
  ctx.fill();

  if (withGlyph) {
    ctx.strokeStyle = ink.mark;
    _glyph(ctx, glyphOf(node), x, y, r * (shape === NodeShapes.GEM ? ICON_SHARE * 0.8 : ICON_SHARE));
  }
};

export const paintHalo = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  colour: string,
  width: number,
) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = width;
  ctx.strokeStyle = colour;
  ctx.stroke();
};
