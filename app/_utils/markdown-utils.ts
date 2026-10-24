const EMPTY_PARAGRAPH_MARK = "\u200b";

const isBlankChar = (char: string) =>
  char === EMPTY_PARAGRAPH_MARK || /\s/.test(char);

const trimBlankTail = (text: string): string => {
  let end = text.length;
  while (end > 0 && isBlankChar(text[end - 1])) end--;
  return text.slice(end).includes(EMPTY_PARAGRAPH_MARK)
    ? text.slice(0, end)
    : text;
};

const normalizeLineEndings = (text: string) => text.replace(/\r\n/g, "\n");

const CODE_STASH_MARK = "\uE000";
const CODE_STASH_REGEX = new RegExp(
  `${CODE_STASH_MARK}(\\d+)${CODE_STASH_MARK}`,
  "g"
);

export const tagOutsideCode = (markdown: string): string => {
  const codeBlockRegex = /```[\s\S]*?```|`[^`]+`|<!--[\s\S]*?-->|<[a-zA-Z\/][^>]*>/g;
  const codeBlocks: string[] = [];
  const stashed = markdown.replace(codeBlockRegex, (match) => {
    codeBlocks.push(match);
    return `${CODE_STASH_MARK}${codeBlocks.length - 1}${CODE_STASH_MARK}`;
  });

  return stashed
    .replace(
      /(?:^|(?<=[\s(]))#([a-zA-Z][a-zA-Z0-9_/-]*)/gm,
      '<span data-tag="$1">$1</span>'
    )
    .replace(CODE_STASH_REGEX, (match, index: string) =>
      codeBlocks[Number(index)] ?? match
    );
};

const RISKY_HTML = [
  /<iframe[\s\S]*?<\/iframe>/gi,
  /<embed[\s\S]*?>/gi,
  /<object[\s\S]*?<\/object>/gi,
  /<script[\s\S]*?<\/script>/gi,
];

const _escapeTags = (match: string): string =>
  match.replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const defangHtml = (text: string): string =>
  RISKY_HTML.reduce((result, pattern) => result.replace(pattern, _escapeTags), text);

export const sanitizeMarkdown = (markdown: string): string => {
  if (!markdown || typeof markdown !== "string") return "";

  let result = trimBlankTail(normalizeLineEndings(markdown)).replace(
    /\\+\[(📎|🎥)\s+([^\]]+?)\\+\]\\+\(([^)]+?)\\+\)/g,
    "[$1 $2]($3)"
  );
  result = result.replace(
    /\\+!\\\[([^\]]*?)\\+\]\\+\(([^)]+?)\\+\)/g,
    "![$1]($2)"
  );
  result = result.replace(/\\+\[([^\]]+?)\\+\]\\+\(([^)]+?)\\+\)/g, "[$1]($2)");

  return defangHtml(result);
};

export interface Heading {
  id: string;
  text: string;
  level: number;
}

const getCodeBlockRanges = (
  content: string
): Array<{ start: number; end: number }> => {
  const codeBlockRanges: Array<{ start: number; end: number }> = [];
  const fencedCodeBlockRegex = /```[\s\S]*?```/g;
  const inlineCodeRegex = /`[^`\n]+`/g;

  let codeMatch;
  while ((codeMatch = fencedCodeBlockRegex.exec(content)) !== null) {
    codeBlockRanges.push({
      start: codeMatch.index,
      end: codeMatch.index + codeMatch[0].length,
    });
  }

  while ((codeMatch = inlineCodeRegex.exec(content)) !== null) {
    codeBlockRanges.push({
      start: codeMatch.index,
      end: codeMatch.index + codeMatch[0].length,
    });
  }

  return codeBlockRanges;
};

const isPositionInCodeBlock = (
  position: number,
  codeBlockRanges: Array<{ start: number; end: number }>
): boolean => {
  return codeBlockRanges.some(
    (range) => position >= range.start && position < range.end
  );
};

export const extractHeadings = (content: string): Heading[] => {
  if (!content?.trim()) return [];

  const codeBlockRanges = getCodeBlockRanges(content);
  const lines = content.split("\n");
  const extractedHeadings: Heading[] = [];
  let currentIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStartIndex = currentIndex;
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (
      headingMatch &&
      !isPositionInCodeBlock(lineStartIndex, codeBlockRanges)
    ) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
      extractedHeadings.push({ id, text, level });
    }

    currentIndex += line.length + 1;
  }

  return extractedHeadings;
};
