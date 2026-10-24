import { canonicalItemHref } from "@/app/_utils/item-href-utils";
import { HARD_BREAK } from "@/app/_utils/markdown/consts";
import { escapeLabel, escapeText } from "./escape";
import { Autolink, autolinkOf, plainText } from "./autolinks";
import { MARKDOWN_MARKS, STAR_MARKS, delimitedMarks, delimiters, isCode, keptCount, sameMark } from "./marks";
import { MarkName, NodeName, type BlockContext, type MarkJson, type NodeJson } from "./types";

const codeSpan = (text: string, inTable?: boolean) => {
  const longest = Math.max(0, ...(text.match(/`+/g) || []).map((run) => run.length));
  const fence = "`".repeat(longest + 1);
  const pad = /^`|`$/.test(text) || (/^ .*[^ ].* $/.test(text)) ? " " : "";
  const body = inTable ? text.replace(/\|/g, "\\|") : text;
  return `${fence}${pad}${body}${pad}${fence}`;
};

export const serializeInline = (
  nodes: NodeJson[] | undefined,
  context: BlockContext,
): string => {
  if (!nodes?.length) return "";
  let out = "";
  let active: MarkJson[] = [];
  let lineStart = true;
  const texts = nodes.map(plainText);
  const starMarks = nodes.some((node) => node.marks?.some((mark) => STAR_MARKS.has(mark.type)));
  const multiline = nodes.some((node) => node.type === NodeName.HardBreak);

  const runLength = (mark: MarkJson, from: number) => {
    let end = from;
    while (end < nodes.length && (isCode(nodes[end]) || nodes[end].marks?.some((other) => sameMark(other, mark)))) end++;
    return end - from;
  };

  const closeTo = (keep: number) => {
    if (active.length <= keep) return;
    const trailing = out.match(/[ \t]+$/)?.[0] ?? "";
    const movesSpace = active.slice(keep).some((mark) => MARKDOWN_MARKS.has(mark.type));
    if (movesSpace && trailing) out = out.slice(0, -trailing.length);
    for (let index = active.length - 1; index >= keep; index--) {
      out += delimiters(active[index])?.close ?? "";
    }
    if (movesSpace) out += trailing;
    active = active.slice(0, keep);
  };

  const bridged = (index: number) => {
    const next = nodes.slice(index + 1).find((other) => !isCode(other));
    const following = next ? delimitedMarks(next) : [];
    return active.slice(0, keptCount(active, following));
  };

  nodes.forEach((node, index) => {
    const hasCode = isCode(node);
    const own = delimitedMarks(node);
    let marks = hasCode && own.length === 0 ? bridged(index) : own;
    const keep = keptCount(active, marks);
    closeTo(keep);

    const style = autolinkOf(node, nodes, index);
    const autolink = style !== Autolink.None;
    let text = node.text || "";
    let opening = autolink
      ? []
      : marks
          .filter((mark) => !active.some((open) => sameMark(open, mark)))
          .map((mark) => ({ mark, run: runLength(mark, index) }))
          .sort((a, b) => b.run - a.run)
          .map(({ mark }) => mark);

    if (node.type === NodeName.Text && !hasCode && opening.some((mark) => MARKDOWN_MARKS.has(mark.type))) {
      const leading = text.match(/^[ \t]+/)?.[0] ?? "";
      out += leading;
      text = text.slice(leading.length);
      if (!text) {
        opening = opening.filter((mark) => !MARKDOWN_MARKS.has(mark.type));
        marks = marks.filter((mark) => !MARKDOWN_MARKS.has(mark.type) || active.some((open) => sameMark(open, mark)));
      }
    }
    opening.forEach((mark) => {
      out += delimiters(mark)?.open ?? "";
    });
    if (!autolink) active = [...active, ...opening];

    const inLink = marks.some((mark) => mark.type === MarkName.Link);
    const before = out.length ? out[out.length - 1] : "";
    const after = texts.slice(index + 1).join("");

    switch (node.type) {
      case NodeName.Text:
        if (autolink) out += style === Autolink.Angle ? `<${text}>` : text;
        else if (hasCode) out += codeSpan(text, context.inTable);
        else out += escapeText(text, {
          lineStart,
          before,
          after,
          pipes: context.inTable || multiline,
          inLink,
          starMarks,
          blockEnd: index === nodes.length - 1 && marks.length === 0,
        });
        break;
      case NodeName.HardBreak: {
        const breakText = context.inTable || context.inHeading
          ? "<br>"
          : node.attrs?.soft
            ? "\n"
            : HARD_BREAK;
        if (breakText === "\n") out = out.replace(/[ \t]+$/, "");
        out += breakText;
        break;
      }
      case NodeName.InternalLink: {
        const attrs = node.attrs || {};
        const href = canonicalItemHref(attrs.href, attrs.uuid, attrs.type);
        out += href && attrs.title ? `[${escapeLabel(attrs.title)}](${href})` : escapeLabel(attrs.title || "");
        break;
      }
      case NodeName.TagLink:
        out += node.attrs?.tag ? `#${node.attrs.tag}` : "";
        break;
      case NodeName.RawInline:
        out += node.attrs?.source || "";
        break;
      default:
        break;
    }

    lineStart = node.type === NodeName.HardBreak && !(context.inTable || context.inHeading);
  });

  closeTo(0);
  return out;
};
