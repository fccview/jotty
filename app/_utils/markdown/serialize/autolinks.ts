import { sameMark } from "./marks";
import { MarkName, NodeName, type NodeJson } from "./types";

const BARE_AUTOLINK = /^https?:\/\/[^\s<>]*[^\s<>.,:;"')\]!?*_~]$/i;
const ANGLE_AUTOLINK = /^[a-z][a-z0-9+.-]{1,31}:[^\s<>]*$/i;

export const plainText = (node: NodeJson): string => {
  switch (node.type) {
    case NodeName.Text:
      return node.text || "";
    case NodeName.TagLink:
      return `#${node.attrs?.tag || ""}`;
    case NodeName.InternalLink:
      return node.attrs?.title || "";
    case NodeName.HardBreak:
      return "\n";
    default:
      return "";
  }
};

export enum Autolink {
  None,
  Bare,
  Angle,
}

export const autolinkOf = (node: NodeJson, nodes: NodeJson[], index: number) => {
  const link = node.marks?.find((mark) => mark.type === MarkName.Link);
  if (!link || node.marks!.length !== 1 || node.type !== NodeName.Text) return Autolink.None;
  const href = String(link.attrs?.href || "");
  if (node.text !== href || !ANGLE_AUTOLINK.test(href) || link.attrs?.title) return Autolink.None;
  const neighbour = (offset: number) => nodes[index + offset];
  const continues = (other: NodeJson | undefined) =>
    other?.marks?.some((mark) => sameMark(mark, link)) ?? false;
  if (continues(neighbour(-1)) || continues(neighbour(1))) return Autolink.None;
  const before = neighbour(-1) ? plainText(neighbour(-1)).slice(-1) : "";
  const after = neighbour(1) ? plainText(neighbour(1))[0] : undefined;
  const bare = BARE_AUTOLINK.test(href) && (!before || /[\s(]/.test(before)) && (!after || /[\s.,:;!?)\]]/.test(after));
  return bare ? Autolink.Bare : Autolink.Angle;
};
