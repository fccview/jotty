const ASCII_PUNCT = /[!-\/:-@\[-`{-~]/;
const ALNUM = /[a-zA-Z0-9\u00c0-\uffff]/;
const SPACE = /\s/;
const WIKILINK = /^\[\[[^\[\]\n]+\]\]/;
const ENTITY = /^&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i;
const BARE_URL = /(https?|ftp)(:\/\/)|(www)(\.)/gi;

export interface EscapeContext {
  lineStart: boolean;
  before: string;
  after: string;
  pipes?: boolean;
  inLink?: boolean;
  starMarks?: boolean;
  blockEnd?: boolean;
  label?: boolean;
}

const isSpace = (char: string | undefined) => char === undefined || char === "" || SPACE.test(char);
const isAlnum = (char: string | undefined) => !!char && ALNUM.test(char);

const LOOSE_STAR = /(^|\s)\*(?=\s|$)/g;

const canPair = (text: string, index: number, context: EscapeContext) =>
  context.starMarks || `${text.slice(index + 1)}${context.after}`.replace(LOOSE_STAR, "$1").includes("*");

const escapeLineStart = (raw: string) => {
  const text = raw.replace(/^[ \t]+/, "");
  if (/^#{1,6}(\s|$)/.test(text)) return `\\${text}`;
  if (/^[>]/.test(text)) return `\\${text}`;
  if (/^[-+*](\s|$)/.test(text)) return `\\${text}`;
  if (/^(=+|-+)\s*$/.test(text) || /^(-[ \t]*){3,}$/.test(text)) return `\\${text}`;
  const ordered = text.match(/^(\d{1,9})([.)])(\s|$)/);
  if (ordered) return `${ordered[1]}\\${text.slice(ordered[1].length)}`;
  return text;
};

const neutraliseUrls = (text: string) =>
  text.replace(BARE_URL, (match, scheme, sep, www, dot) =>
    scheme ? `${scheme}\\${sep}` : `${www}\\${dot}`,
  );

export const escapeText = (text: string, context: EscapeContext): string => {
  let out = "";
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const prev = index === 0 ? context.before : text[index - 1];
    const next = index === text.length - 1 ? context.after[0] : text[index + 1];

    if (context.label && (char === "[" || char === "]")) {
      out += `\\${char}`;
      continue;
    }

    if (char === "[") {
      const wiki = text.slice(index).match(WIKILINK);
      if (wiki) {
        out += wiki[0];
        index += wiki[0].length - 1;
        continue;
      }
      out += text.indexOf("]", index) === -1 && !context.after.includes("]") ? char : "\\[";
      continue;
    }

    switch (char) {
      case "\\":
        if (next === undefined || next === "") out += context.blockEnd ? char : "\\\\";
        else out += ASCII_PUNCT.test(next) ? "\\\\" : char;
        break;
      case "`":
        out += "\\`";
        break;
      case "*":
        out += (isSpace(prev) && isSpace(next)) || !canPair(text, index, context) ? char : "\\*";
        break;
      case "_":
        out += (isAlnum(prev) && isAlnum(next)) || (isSpace(prev) && isSpace(next)) ? char : "\\_";
        break;
      case "~":
        out += isSpace(prev) && isSpace(next) ? char : "\\~";
        break;
      case "<":
        out += next && /[a-zA-Z\/!?]/.test(next) ? "\\<" : char;
        break;
      case "&":
        out += ENTITY.test(text.slice(index)) ? "\\&" : char;
        break;
      case "\u00a0":
        out += "&nbsp;";
        break;
      case "|":
        out += context.pipes ? "\\|" : char;
        break;
      default:
        out += char;
    }
  }

  if (!context.inLink) out = neutraliseUrls(out);
  return context.lineStart ? escapeLineStart(out) : out;
};

export const escapeLabel = (text: string) =>
  escapeText(text, { lineStart: false, before: "", after: "", inLink: true, label: true });

export const escapeHtmlText = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const escapeHtmlAttr = (text: string) =>
  escapeHtmlText(text).replace(/"/g, "&quot;");
