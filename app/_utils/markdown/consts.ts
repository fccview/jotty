export const LEGACY_EMPTY_PARAGRAPH = "​";
export const NBSP = " ";
export const EMPTY_PARAGRAPH = "&nbsp;";

export enum RawAttr {
  Block = "data-raw-block",
  Inline = "data-raw-inline",
  Source = "data-source",
}

export enum RawNode {
  Block = "rawBlock",
  Inline = "rawInline",
}

export const SOFT_BREAK_ATTR = "data-soft";
export const HARD_BREAK = "  \n";

export const KNOWN_BLOCK_HTML =
  /^\s*(<!--\s*(drawio|excalidraw)-diagram|<\/?(details|summary|table|thead|tbody|tfoot|tr|th|td|img)\b)/i;

export const KNOWN_INLINE_TAGS = new Set([
  "mark",
  "u",
  "kbd",
  "sub",
  "sup",
  "abbr",
  "b",
  "strong",
  "i",
  "em",
  "s",
  "del",
  "strike",
  "code",
  "a",
  "br",
  "img",
]);

export const VOID_INLINE_TAGS = new Set(["br", "img"]);

export const INLINE_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "title", "target", "rel"],
  abbr: ["title"],
  mark: ["style"],
  img: ["src", "alt", "title", "style", "width", "height"],
  span: ["style", "data-tag"],
};

export const SPAN_STYLES = new Set(["color", "font-family"]);
export const SPAN_MARKERS = ["style", "data-tag"];

export const PLAIN_CODE_LANGUAGE = "plaintext";
export const MERMAID_LANGUAGE = "mermaid";
