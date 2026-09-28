const LINE_BREAK = /(\r\n|\n|\r)/;

export interface Line {
  text: string;
  eol: string;
}

export const splitLines = (text: string): Line[] => {
  const parts = text.split(LINE_BREAK);
  const lines: Line[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    lines.push({ text: parts[i], eol: parts[i + 1] ?? "" });
  }
  return lines;
};

export const joinLines = (lines: Line[]): string =>
  lines.map((line) => line.text + line.eol).join("");

const _isBlank = (line?: Line): boolean => Boolean(line && line.eol && line.text.trim() === "");

const _isEnd = (lines: Line[], index: number): boolean =>
  index >= lines.length || (index === lines.length - 1 && !lines[index].eol && !lines[index].text);

const _without = (lines: Line[], index: number): Line[] => [
  ...lines.slice(0, index),
  ...lines.slice(index + 1),
];

export const dropLine = (lines: Line[], index: number): Line[] => {
  const kept = _without(lines, index);
  const above = index - 1;
  const gapAbove = above < 0 || _isBlank(kept[above]);
  const gapBelow = _isEnd(kept, index) || _isBlank(kept[index]);
  if (!gapAbove || !gapBelow) return kept;
  if (above >= 0 && _isBlank(kept[above])) return _without(kept, above);
  if (_isBlank(kept[index])) return _without(kept, index);
  return kept;
};

export const lineAt = (lines: Line[], offset: number): number => {
  let seen = 0;
  for (let i = 0; i < lines.length; i++) {
    seen += lines[i].text.length + lines[i].eol.length;
    if (offset < seen) return i;
  }
  return lines.length - 1;
};

export const lineStart = (lines: Line[], index: number): number =>
  lines.slice(0, index).reduce((sum, line) => sum + line.text.length + line.eol.length, 0);
