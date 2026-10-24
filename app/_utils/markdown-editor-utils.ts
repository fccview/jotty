export interface TextareaSelection {
  start: number;
  end: number;
  selectedText: string;
}

export interface EditorResult {
  content: string;
  selectionStart: number;
  selectionEnd: number;
}

export const getTextareaSelection = (
  textarea: HTMLTextAreaElement
): TextareaSelection => ({
  start: textarea.selectionStart,
  end: textarea.selectionEnd,
  selectedText: textarea.value.substring(
    textarea.selectionStart,
    textarea.selectionEnd
  ),
});

const _getLineAtPosition = (
  value: string,
  pos: number
): { lineStart: number; lineEnd: number; lineContent: string } => {
  const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
  let lineEnd = value.indexOf("\n", pos);
  if (lineEnd === -1) lineEnd = value.length;
  return {
    lineStart,
    lineEnd,
    lineContent: value.substring(lineStart, lineEnd),
  };
};

export const MARKDOWN_TEXTAREA_ID = "markdown-editor-textarea";
export const MARKDOWN_EDITOR_CLASS = "markdown-code-editor";

export const getMarkdownTextarea = (): HTMLTextAreaElement | null =>
  document.getElementById(MARKDOWN_TEXTAREA_ID) as HTMLTextAreaElement | null;

const _diffRange = (prev: string, next: string) => {
  const max = Math.min(prev.length, next.length);
  let head = 0;
  while (head < max && prev[head] === next[head]) head++;
  let tail = 0;
  while (
    tail < max - head &&
    prev[prev.length - 1 - tail] === next[next.length - 1 - tail]
  )
    tail++;
  return {
    from: head,
    to: prev.length - tail,
    text: next.slice(head, next.length - tail),
  };
};

export const mapPosition = (prev: string, next: string, position: number) => {
  const { from, to, text } = _diffRange(prev, next);
  if (position <= from) return position;
  if (position >= to) return position + next.length - prev.length;
  return from + text.length;
};

interface PendingCaret {
  value: string;
  start: number;
  end: number;
  focus: boolean;
}

let pendingCaret: PendingCaret | null = null;

export const applyPendingCaret = () => {
  const pending = pendingCaret;
  const textarea = getMarkdownTextarea();
  if (!pending || !textarea || textarea.value !== pending.value) return;
  pendingCaret = null;
  if (pending.focus) textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(pending.start, pending.end);
};

export const keepCaretThrough = (prev: string, next: string) => {
  const textarea = getMarkdownTextarea();
  if (!textarea || document.activeElement !== textarea || prev === next) return;
  const base =
    pendingCaret?.value === prev
      ? pendingCaret
      : textarea.value === prev
        ? { start: textarea.selectionStart, end: textarea.selectionEnd, focus: false }
        : null;
  if (!base) return;
  pendingCaret = {
    value: next,
    start: mapPosition(prev, next, base.start),
    end: mapPosition(prev, next, base.end),
    focus: base.focus,
  };
};

const _nativeReplace = (textarea: HTMLTextAreaElement, next: string) => {
  if (typeof document === "undefined" || document.activeElement !== textarea)
    return false;
  const { from, to, text } = _diffRange(textarea.value, next);
  textarea.setSelectionRange(from, to);
  try {
    return text
      ? document.execCommand("insertText", false, text)
      : document.execCommand("delete");
  } catch (error) {
    console.warn("Native markdown edit failed, falling back:", error);
    return false;
  }
};

const _updateEditor = (
  textarea: HTMLTextAreaElement,
  content: string,
  start: number,
  end: number
): string => {
  if (textarea.value !== content) {
    const applied = _nativeReplace(textarea, content);
    if (!applied || textarea.value !== content) textarea.value = content;
  }
  textarea.setSelectionRange(start, end);
  return content;
};

interface HistoryRecord {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  timestamp: number;
}

export interface MarkdownHistory {
  stack: HistoryRecord[];
  offset: number;
}

type HistorySource = () => MarkdownHistory | null;

const HISTORY_LIMIT = 100;
const SEALED_TIMESTAMP = 0;

let historySource: HistorySource | null = null;

export const bindMarkdownHistory = (source: HistorySource) => {
  historySource = source;
  return () => {
    if (historySource === source) historySource = null;
  };
};

const _snapshot = (textarea: HTMLTextAreaElement): HistoryRecord => ({
  value: textarea.value,
  selectionStart: textarea.selectionStart,
  selectionEnd: textarea.selectionEnd,
  timestamp: SEALED_TIMESTAMP,
});

export const recordMarkdownEdit = (
  history: MarkdownHistory,
  before: HistoryRecord,
  after: HistoryRecord,
  top: { offset: number; record: HistoryRecord | null }
) => {
  if (before.value === after.value) return;
  const kept = history.stack.slice(0, Math.max(top.offset, 0));
  if (top.record && top.record.value !== before.value) kept.push(top.record);
  const stack = [...kept, before, after].slice(-HISTORY_LIMIT);
  history.stack = stack;
  history.offset = stack.length - 1;
};

export const runMarkdownEdit = (
  edit: (textarea: HTMLTextAreaElement) => string,
  onChange?: (content: string) => void
) => {
  const textarea = getMarkdownTextarea();
  if (!textarea || !onChange) return;
  textarea.focus({ preventScroll: true });
  const history = historySource?.() ?? null;
  const top = history
    ? { offset: history.offset, record: history.stack[history.offset] ? { ...history.stack[history.offset] } : null }
    : null;
  const before = _snapshot(textarea);
  const content = edit(textarea);
  const after = { ..._snapshot(textarea), value: content };
  if (history && top) recordMarkdownEdit(history, before, after, top);
  pendingCaret = { value: content, start: after.selectionStart, end: after.selectionEnd, focus: true };
  onChange(content);
  applyPendingCaret();
};

export const insertTextAtCursor = (
  textarea: HTMLTextAreaElement,
  textBefore: string,
  textAfter: string,
  selectedText: string = "",
  cursorOffset: number = 0
): string => {
  const { start, end } = getTextareaSelection(textarea);
  const value = textarea.value;
  const newText = textBefore + selectedText + textAfter;
  const newValue = value.substring(0, start) + newText + value.substring(end);
  const newCursorPos =
    start + textBefore.length + selectedText.length + cursorOffset;
  return _updateEditor(textarea, newValue, newCursorPos, newCursorPos);
};

export const insertSelectedText = (
  textarea: HTMLTextAreaElement,
  text: string
): string => {
  const { start, end } = getTextareaSelection(textarea);
  const value = textarea.value;
  const newValue = value.substring(0, start) + text + value.substring(end);
  return _updateEditor(textarea, newValue, start, start + text.length);
};

export const wrapOrInsert = (
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string = "",
  placeholder: string = ""
): string => {
  const { selectedText } = getTextareaSelection(textarea);
  const content = selectedText || placeholder || "";
  const offset = !selectedText && placeholder ? -suffix.length : 0;
  return insertTextAtCursor(textarea, prefix, suffix, content, offset);
};

const toggleInlineFormat = (
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string
): EditorResult => {
  const { start, end, selectedText } = getTextareaSelection(textarea);
  const value = textarea.value;

  if (
    selectedText.startsWith(prefix) &&
    selectedText.endsWith(suffix) &&
    selectedText.length >= prefix.length + suffix.length
  ) {
    const unwrapped = selectedText.slice(
      prefix.length,
      selectedText.length - suffix.length
    );
    return {
      content: value.substring(0, start) + unwrapped + value.substring(end),
      selectionStart: start,
      selectionEnd: start + unwrapped.length,
    };
  }

  const beforeStart = Math.max(0, start - prefix.length);
  const afterEnd = Math.min(value.length, end + suffix.length);
  if (
    value.substring(beforeStart, start) === prefix &&
    value.substring(end, afterEnd) === suffix
  ) {
    return {
      content:
        value.substring(0, beforeStart) +
        selectedText +
        value.substring(afterEnd),
      selectionStart: beforeStart,
      selectionEnd: beforeStart + selectedText.length,
    };
  }

  return {
    content:
      value.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      value.substring(end),
    selectionStart: start + prefix.length,
    selectionEnd: start + prefix.length + selectedText.length,
  };
};

const applyInline = (
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string
): string => {
  const res = toggleInlineFormat(textarea, prefix, suffix);
  return _updateEditor(
    textarea,
    res.content,
    res.selectionStart,
    res.selectionEnd
  );
};

export const insertBold = (ta: HTMLTextAreaElement) =>
  applyInline(ta, "**", "**");
export const insertItalic = (ta: HTMLTextAreaElement) =>
  applyInline(ta, "*", "*");
export const insertUnderline = (ta: HTMLTextAreaElement) =>
  applyInline(ta, "<u>", "</u>");
export const insertStrikethrough = (ta: HTMLTextAreaElement) =>
  applyInline(ta, "~~", "~~");
export const insertInlineCode = (ta: HTMLTextAreaElement) =>
  applyInline(ta, "`", "`");
export const insertSubscript = (ta: HTMLTextAreaElement) =>
  applyInline(ta, "<sub>", "</sub>");
export const insertSuperscript = (ta: HTMLTextAreaElement) =>
  applyInline(ta, "<sup>", "</sup>");
export const insertHighlight = (ta: HTMLTextAreaElement) =>
  applyInline(ta, "<mark>", "</mark>");
export const insertAbbreviation = (ta: HTMLTextAreaElement, title: string) =>
  wrapOrInsert(ta, `<abbr title="${title}">`, "</abbr>", "");

const _shiftSelection = (
  textarea: HTMLTextAreaElement,
  lineStart: number,
  oldLines: string[],
  newLines: string[]
) => {
  const { start, end } = getTextareaSelection(textarea);
  const firstDelta = newLines[0].length - oldLines[0].length;
  const blockEnd = lineStart + newLines.join("\n").length;
  const totalDelta = blockEnd - lineStart - oldLines.join("\n").length;
  const from = Math.min(blockEnd, Math.max(lineStart, start + firstDelta));
  const to = start === end ? from : Math.min(blockEnd, Math.max(from, end + totalDelta));
  return { from, to };
};

const _replaceLines = (
  textarea: HTMLTextAreaElement,
  mapLines: (lines: string[]) => string[]
): string => {
  const { start, end } = getTextareaSelection(textarea);
  const value = textarea.value;
  const { lineStart } = _getLineAtPosition(value, start);
  const { lineEnd } = _getLineAtPosition(value, end);
  const lines = value.substring(lineStart, lineEnd).split("\n");
  const newLines = mapLines(lines);
  const newValue = value.substring(0, lineStart) + newLines.join("\n") + value.substring(lineEnd);
  const { from, to } = _shiftSelection(textarea, lineStart, lines, newLines);
  return _updateEditor(textarea, newValue, from, to);
};

const processLineSelection = (
  textarea: HTMLTextAreaElement,
  pattern: RegExp,
  processFn: (line: string, index: number, allMatch: boolean) => string
): string =>
  _replaceLines(textarea, (lines) => {
    const hasNonEmpty = lines.some((l) => l.trim() !== "");
    const allMatch = hasNonEmpty && lines.every((l) => pattern.test(l) || l.trim() === "");
    return lines.map((line, i) => processFn(line, i, allMatch));
  });

const BULLET_LINE = /^\s*[-*+]\s/;
const BULLET_MARKER = /^(\s*)[-*+]\s+/;
const ORDERED_LINE = /^\s*\d+\.\s/;
const ORDERED_MARKER = /^(\s*)\d+\.\s+/;
const TASK_LINE = /^\s*[-*+]\s\[[ xX]\]/;
const BULLET = "- ";

const _allNonEmpty = (lines: string[], pattern: RegExp) => {
  const nonEmpty = lines.filter((l) => l.trim() !== "");
  return nonEmpty.length > 0 && nonEmpty.every((l) => pattern.test(l));
};

export const insertBulletList = (textarea: HTMLTextAreaElement): string =>
  _replaceLines(textarea, (lines) => {
    const allBullet = _allNonEmpty(lines, BULLET_LINE);
    const allOrdered = _allNonEmpty(lines, ORDERED_LINE);
    return lines.map((line) => {
      if (allBullet) return line.trim() === "" ? line : line.replace(BULLET_MARKER, "$1");
      if (allOrdered) return line.trim() === "" ? line : line.replace(ORDERED_MARKER, `$1${BULLET}`);
      if (line.trim() === "") return BULLET;
      if (BULLET_LINE.test(line)) return line;
      if (ORDERED_LINE.test(line)) return line.replace(ORDERED_MARKER, `$1${BULLET}`);
      return BULLET + line;
    });
  });

export const insertOrderedList = (textarea: HTMLTextAreaElement): string =>
  _replaceLines(textarea, (lines) => {
    const allOrdered = _allNonEmpty(lines, ORDERED_LINE);
    const allBullet = _allNonEmpty(lines, BULLET_LINE);
    let num = 1;
    return lines.map((line) => {
      if (allOrdered) return line.trim() === "" ? line : line.replace(ORDERED_MARKER, "$1");
      if (allBullet) return line.trim() === "" ? line : line.replace(BULLET_MARKER, `$1${num++}. `);
      if (line.trim() === "") return `${num++}. `;
      if (ORDERED_LINE.test(line)) return line.replace(ORDERED_MARKER, `$1${num++}. `);
      if (BULLET_LINE.test(line)) return line.replace(BULLET_MARKER, `$1${num++}. `);
      return `${num++}. ${line}`;
    });
  });

export const insertTaskList = (textarea: HTMLTextAreaElement): string =>
  processLineSelection(textarea, /^-\s\[[ x]\]\s/, (line, _, allMatch) => {
    if (line.trim() === "") return line;
    if (allMatch) return line.replace(/^-\s\[[ x]\]\s/, "");
    const clean = line.replace(/^-\s(\[[ x]\]\s)?/, "");
    return `- [ ] ${clean}`;
  });

export const insertBlockquote = (textarea: HTMLTextAreaElement): string =>
  processLineSelection(textarea, /^>\s/, (line, _, allMatch) => {
    if (line.trim() === "") return line;
    return allMatch ? line.replace(/^>\s/, "") : `> ${line}`;
  });

export const insertHeading = (
  textarea: HTMLTextAreaElement,
  level: number = 2
): string => {
  const { start } = getTextareaSelection(textarea);
  const { lineStart, lineEnd, lineContent } = _getLineAtPosition(
    textarea.value,
    start
  );

  const currentLevel = (lineContent.match(/^(#{1,6})\s/) || [])[1]?.length || 0;
  const prefix = "#".repeat(level) + " ";

  let newLine, newCursor;

  if (currentLevel === level) {
    newLine = lineContent.replace(/^#{1,6}\s/, "");
    newCursor = lineStart + Math.max(0, start - lineStart - prefix.length);
  } else if (currentLevel > 0) {
    newLine = lineContent.replace(/^#{1,6}\s/, prefix);
    newCursor =
      lineStart +
      prefix.length +
      Math.max(0, start - lineStart - currentLevel - 1);
  } else {
    newLine = prefix + lineContent;
    newCursor = start + prefix.length;
  }

  const newValue =
    textarea.value.substring(0, lineStart) +
    newLine +
    textarea.value.substring(lineEnd);
  newCursor = Math.max(
    lineStart,
    Math.min(newCursor, lineStart + newLine.length)
  );

  return _updateEditor(textarea, newValue, newCursor, newCursor);
};

export const insertLink = (ta: HTMLTextAreaElement, url: string = "") => {
  const { selectedText } = getTextareaSelection(ta);
  return selectedText
    ? insertTextAtCursor(ta, "[", `](${url})`, selectedText)
    : insertTextAtCursor(ta, "[", `](${url})`, "", -url.length - 3);
};

export const insertImage = (
  ta: HTMLTextAreaElement,
  url: string,
  alt: string = ""
) => insertTextAtCursor(ta, `![${alt}](`, ")", url, 0);

export const insertVideo = (
  ta: HTMLTextAreaElement,
  url: string,
  name: string
) => insertTextAtCursor(ta, `[🎥 ${name}](`, ")", url, 0);

export const insertFile = (
  ta: HTMLTextAreaElement,
  url: string,
  name: string
) => insertTextAtCursor(ta, `[📎 ${name}](`, ")", url, 0);

export const insertInternalLink = (
  ta: HTMLTextAreaElement,
  title: string,
  href: string
) => insertTextAtCursor(ta, `[${title}](`, ")", href, 0);

const _ownLines = (ta: HTMLTextAreaElement) => {
  const { start, end } = getTextareaSelection(ta);
  const value = ta.value;
  return {
    lead: start > 0 && value[start - 1] !== "\n" ? "\n" : "",
    trail: value[end] === "\n" ? "" : "\n",
  };
};

const _insertBlock = (ta: HTMLTextAreaElement, open: string, close: string, body: string) => {
  const { lead, trail } = _ownLines(ta);
  return insertTextAtCursor(ta, lead + open, close + trail, body, 0);
};

export const insertCodeBlock = (ta: HTMLTextAreaElement, lang: string = "") =>
  _insertBlock(ta, "```" + lang + "\n", "\n```", getTextareaSelection(ta).selectedText);

export const insertDetails = (ta: HTMLTextAreaElement, sum: string = "Details") =>
  _insertBlock(ta, `<details>\n<summary>${sum}</summary>\n\n`, "\n\n</details>", getTextareaSelection(ta).selectedText);

export const insertMermaid = (ta: HTMLTextAreaElement, content?: string) => {
  const def =
    content ||
    `graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Option 1]\n    B -->|No| D[Option 2]\n    C --> E[End]\n    D --> E`;
  return _insertBlock(ta, "```mermaid\n", "\n```", def);
};

export const insertTable = (
  ta: HTMLTextAreaElement,
  r: number = 3,
  c: number = 3
) => {
  const head = "| " + Array(c).fill("Header").join(" | ") + " |\n";
  const sep = "| " + Array(c).fill("---").join(" | ") + " |\n";
  const rows = Array(r - 1)
    .fill("| " + Array(c).fill("Cell").join(" | ") + " |\n")
    .join("");
  return insertTextAtCursor(ta, "\n" + head + sep + rows + "\n", "", "", 0);
};

const LIST_ITEM_REGEX = /^(\s*)([-*+]|\d+\.)(\s+)(\[[ xX]\](?:\s+|$))?(.*)$/;
const ORDERED_MARKER_REGEX = /^\d+\.$/;
const LIST_INDENT = "    ";
const EMPTY_TASK = "[ ] ";

interface ListItemParts {
  indent: string;
  marker: string;
  spacing: string;
  task: string;
  content: string;
}

const _parseListItem = (line: string): ListItemParts | null => {
  const match = line.match(LIST_ITEM_REGEX);
  if (!match) return null;
  const [, indent, marker, spacing, task = "", content] = match;
  return { indent, marker, spacing, task, content };
};

const _listPrefix = ({ indent, marker, spacing, task }: ListItemParts) =>
  indent + marker + spacing + task;

const _isOrdered = (marker: string) => ORDERED_MARKER_REGEX.test(marker);

const _nextMarker = (marker: string) =>
  _isOrdered(marker) ? `${parseInt(marker, 10) + 1}.` : marker;

const _nestedMarker = (
  value: string,
  lineStart: number,
  item: ListItemParts,
  indent: string
): string => {
  if (!_isOrdered(item.marker)) return item.marker;
  const above = value.substring(0, Math.max(0, lineStart - 1)).split("\n");
  for (let i = above.length - 1; i >= 0; i--) {
    const prev = _parseListItem(above[i]);
    if (!prev || prev.indent.length < indent.length) break;
    if (prev.indent.length === indent.length && _isOrdered(prev.marker)) {
      return _nextMarker(prev.marker);
    }
  }
  return "1.";
};

export const handleListEnter = (
  textarea: HTMLTextAreaElement
): string | null => {
  const { start, end } = getTextareaSelection(textarea);
  if (start !== end) return null;
  const { lineContent, lineStart } = _getLineAtPosition(textarea.value, start);

  const item = _parseListItem(lineContent);
  if (!item || start - lineStart < _listPrefix(item).length) return null;

  if (!item.content.trim()) {
    const newVal =
      textarea.value.substring(0, lineStart) +
      textarea.value.substring(lineStart + lineContent.length);
    return _updateEditor(textarea, newVal, lineStart, lineStart);
  }

  const task = item.task ? EMPTY_TASK : "";
  const prefix = item.indent + _nextMarker(item.marker) + item.spacing + task;
  return insertTextAtCursor(textarea, "\n" + prefix, "", "", 0);
};

export const indentListItem = (
  textarea: HTMLTextAreaElement
): string | null => {
  const { start, end } = getTextareaSelection(textarea);
  if (start !== end) return null;
  const value = textarea.value;
  const { lineContent, lineStart, lineEnd } = _getLineAtPosition(value, start);

  const item = _parseListItem(lineContent);
  if (!item) return null;

  const indent = item.indent + LIST_INDENT;
  const marker = _nestedMarker(value, lineStart, item, indent);
  const newLine = _listPrefix({ ...item, indent, marker }) + item.content;
  const newVal = value.substring(0, lineStart) + newLine + value.substring(lineEnd);
  const cursor = start + newLine.length - lineContent.length;
  return _updateEditor(textarea, newVal, cursor, cursor);
};

export const indentLines = (textarea: HTMLTextAreaElement): string => {
  let orderedCounter = 1;
  let lastWasOrdered = false;
  const result = processLineSelection(textarea, /^/, (line) => {
    if (line.trim() === "") {
      lastWasOrdered = false;
      return line;
    }
    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);
    if (orderedMatch) {
      if (!lastWasOrdered) orderedCounter = 1;
      const [, indent, , content] = orderedMatch;
      lastWasOrdered = true;
      return `    ${indent}${orderedCounter++}. ${content}`;
    }
    lastWasOrdered = false;
    return "    " + line;
  });
  const pos = textarea.selectionEnd;
  textarea.setSelectionRange(pos, pos);
  return result;
};

export const outdentLines = (textarea: HTMLTextAreaElement): string => {
  const result = processLineSelection(textarea, /^ {4}/, (line) =>
    line.startsWith("    ") ? line.slice(4) : line
  );
  const pos = textarea.selectionEnd;
  textarea.setSelectionRange(pos, pos);
  return result;
};

export const autolinkPastedContent = (
  textarea: HTMLTextAreaElement,
  pasted: string
): string | null => {
  const { start, end, selectedText } = getTextareaSelection(textarea);
  if (!selectedText) return null;

  const trimmed = pasted.trim();
  const isUrl = /^https?:\/\/\S+$/.test(trimmed);
  const isEmail = /^[\w.-]+@[\w.-]+\.\w+$/.test(trimmed);

  if (!isUrl && !isEmail) return null;

  const href = isEmail ? `mailto:${trimmed}` : trimmed;
  const newVal =
    textarea.value.substring(0, start) +
    `[${selectedText}](${href})` +
    textarea.value.substring(end);
  const newEnd = start + selectedText.length + href.length + 4;
  return _updateEditor(textarea, newVal, start, newEnd);
};

export interface MarkdownFormats {
  heading: number;
  blockquote: boolean;
  bulletList: boolean;
  orderedList: boolean;
  taskList: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  link: boolean;
}

export const NO_MARKDOWN_FORMATS: MarkdownFormats = {
  heading: 0,
  blockquote: false,
  bulletList: false,
  orderedList: false,
  taskList: false,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  code: false,
  link: false,
};

const HEADING_LINE = /^(#{1,6})\s/;
const QUOTE_LINE = /^\s*>/;
const DOUBLE_STAR = /\*\*/g;
const LINK_SPAN = /!?\[[^\]]*\]\([^)]*\)/g;

const _count = (text: string, needle: string) => text.split(needle).length - 1;

const _between = (before: string, after: string, delimiter: string) =>
  _count(before, delimiter) % 2 === 1 && after.includes(delimiter);

const _insideTag = (before: string, after: string, open: string, close: string) =>
  before.lastIndexOf(open) > before.lastIndexOf(close) && after.includes(close);

const _insideLink = (line: string, column: number) =>
  Array.from(line.matchAll(LINK_SPAN)).some(
    (match) => column > match.index && column < match.index + match[0].length
  );

export const markdownFormatsAt = (value: string, position: number): MarkdownFormats => {
  const { lineStart, lineContent } = _getLineAtPosition(value, position);
  const column = position - lineStart;
  const before = lineContent.slice(0, column);
  const after = lineContent.slice(column);
  const body = lineContent.replace(BULLET_MARKER, "$1");
  const bodyOffset = lineContent.length - body.length;
  const plainBefore = before.slice(Math.min(bodyOffset, before.length)).replace(DOUBLE_STAR, "");
  const plainAfter = after.replace(DOUBLE_STAR, "");
  const taskList = TASK_LINE.test(lineContent);
  return {
    heading: HEADING_LINE.exec(lineContent)?.[1].length ?? 0,
    blockquote: QUOTE_LINE.test(lineContent),
    bulletList: BULLET_LINE.test(lineContent) && !taskList,
    orderedList: ORDERED_LINE.test(lineContent),
    taskList,
    bold: _between(before, after, "**"),
    italic: _between(plainBefore, plainAfter, "*"),
    underline: _insideTag(before, after, "<u>", "</u>"),
    strike: _between(before, after, "~~"),
    code: _between(before, after, "`"),
    link: _insideLink(lineContent, column),
  };
};

export const sameFormats = (a: MarkdownFormats, b: MarkdownFormats) =>
  (Object.keys(a) as (keyof MarkdownFormats)[]).every((key) => a[key] === b[key]);
