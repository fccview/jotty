import { NodeName, type BlockContext, type NodeJson } from "./serialize/types";

const BULLETS = ["-", "*", "+"];
const DELIMITERS = [".", ")"];
const LIST_MARKER = /^\s*(?:([-*+])|\d+([.)]))/;

export interface Marked {
  node: NodeJson;
  context?: BlockContext;
}

const isOrdered = (node: NodeJson) => node.type === NodeName.OrderedList;

const familyOf = (node: NodeJson) => {
  if (isOrdered(node)) return DELIMITERS;
  if (node.type === NodeName.BulletList || node.type === NodeName.TaskList) return BULLETS;
  return null;
};

const markerOf = (piece: Marked | undefined) =>
  piece && (isOrdered(piece.node) ? piece.context?.delimiter : piece.context?.bullet);

const sameFamily = (piece: Marked | undefined, node: NodeJson) =>
  !!piece && familyOf(piece.node) !== null && familyOf(piece.node) === familyOf(node);

const withMarker = (node: NodeJson, marker: string): Partial<BlockContext> =>
  isOrdered(node) ? { delimiter: marker } : { bullet: marker };

export const preservedStyle = (node: NodeJson, src: string): Partial<BlockContext> => {
  const match = familyOf(node) ? src.match(LIST_MARKER) : null;
  if (!match) return {};
  return isOrdered(node) ? { delimiter: match[2] } : { bullet: match[1] };
};

export const clashes = (previous: Marked | undefined, piece: Marked) =>
  sameFamily(previous, piece.node) && markerOf(previous) !== undefined && markerOf(previous) === markerOf(piece);

export const freshMarker = (node: NodeJson, previous?: Marked, following?: Marked): Partial<BlockContext> => {
  const options = familyOf(node);
  if (!options) return {};
  const avoid = [previous, following].filter((piece) => sameFamily(piece, node)).map(markerOf);
  const pick =
    options.find((option) => !avoid.includes(option)) ??
    options.find((option) => option !== markerOf(previous)) ??
    options[0];
  return withMarker(node, pick);
};
