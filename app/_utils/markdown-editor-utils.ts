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

const _updateEditor = (
  textarea: HTMLTextAreaElement,
  content: string,
  start: number,
  end: number
): string => {
  textarea.value = content;
  textarea.setSelectionRange(start, end);
  return content;
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

const processLineSelection = (
  textarea: HTMLTextAreaElement,
  pattern: RegExp,
  processFn: (line: string, index: number, allMatch: boolean) => string
): string => {
  const { start, end } = getTextareaSelection(textarea);
  const value = textarea.value;
  const { lineStart } = _getLineAtPosition(value, start);
  const { lineEnd } = _getLineAtPosition(value, end);
  const lines = value.substring(lineStart, lineEnd).split("\n");

  const allMatch = lines.every((l) => pattern.test(l) || l.trim() === "");
  const newLines = lines.map((line, i) => processFn(line, i, allMatch));
  const newContent = newLines.join("\n");
  const newValue =
    value.substring(0, lineStart) + newContent + value.substring(lineEnd);

  const cursorTarget = lineStart + newLines[0].length;

  if (allMatch) {
    _updateEditor(textarea, newValue, lineStart, lineStart + newContent.length);
  } else {
    _updateEditor(textarea, newValue, cursorTarget, cursorTarget);
  }

  return newValue;
};

export const insertBulletList = (textarea: HTMLTextAreaElement): string =>
  processLineSelection(textarea, /^-\s/, (line, _, allMatch) => {
    if (line.trim() === "") return line;
    return allMatch ? line.replace(/^-\s/, "") : `- ${line}`;
  });

export const insertOrderedList = (textarea: HTMLTextAreaElement): string => {
  let num = 1;
  return processLineSelection(textarea, /^\d+\.\s/, (line, _, allMatch) => {
    if (line.trim() === "") return line;
    if (allMatch) return line.replace(/^\d+\.\s/, "");
    const clean = line.replace(/^\d+\.\s/, "");
    return `${num++}. ${clean}`;
  });
};

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

export const insertCodeBlock = (ta: HTMLTextAreaElement, lang: string = "") => {
  const { selectedText } = getTextareaSelection(ta);
  const open = "```" + lang + "\n";
  const close = "\n```\n";
  return selectedText
    ? insertTextAtCursor(ta, open, close, selectedText)
    : insertTextAtCursor(ta, open, close, "", -close.length + 1);
};

export const insertDetails = (
  ta: HTMLTextAreaElement,
  sum: string = "Details"
) => {
  const { selectedText } = getTextareaSelection(ta);
  const open = `<details>\n<summary>${sum}</summary>\n\n`;
  const close = `\n\n</details>\n`;
  return selectedText
    ? insertTextAtCursor(ta, open, close, selectedText)
    : insertTextAtCursor(ta, open, close, "", -close.length + 3);
};

export const insertMermaid = (ta: HTMLTextAreaElement, content?: string) => {
  const def =
    content ||
    `graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Option 1]\n    B -->|No| D[Option 2]\n    C --> E[End]\n    D --> E`;
  return insertTextAtCursor(ta, "```mermaid\n", "\n```\n", def, 0);
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

export const isInBulletListItem = (textarea: HTMLTextAreaElement): boolean => {
  const { start } = getTextareaSelection(textarea);
  const { lineContent } = _getLineAtPosition(textarea.value, start);
  return /^-\s/.test(lineContent);
};

export const handleBulletListEnter = (
  textarea: HTMLTextAreaElement
): string | null => {
  const { start } = getTextareaSelection(textarea);
  const { lineContent, lineStart } = _getLineAtPosition(textarea.value, start);

  const match = lineContent.match(/^(-\s+)(.*)/);
  if (!match) return null;

  const [, bullet, content] = match;
  if (!content.trim()) {
    const newVal =
      textarea.value.substring(0, lineStart) +
      textarea.value.substring(lineStart + lineContent.length);
    return _updateEditor(textarea, newVal, lineStart, lineStart);
  }

  return insertTextAtCursor(textarea, "\n" + bullet, "", "", 0);
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
