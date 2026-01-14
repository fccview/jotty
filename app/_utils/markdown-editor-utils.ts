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
): TextareaSelection => {
  return {
    start: textarea.selectionStart,
    end: textarea.selectionEnd,
    selectedText: textarea.value.substring(
      textarea.selectionStart,
      textarea.selectionEnd
    ),
  };
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

  textarea.setSelectionRange(newCursorPos, newCursorPos);

  return newValue;
};

const isWrappedWith = (
  text: string,
  prefix: string,
  suffix: string
): boolean => {
  return (
    text.startsWith(prefix) &&
    text.endsWith(suffix) &&
    text.length >= prefix.length + suffix.length
  );
};

const unwrap = (text: string, prefix: string, suffix: string): string => {
  return text.slice(prefix.length, text.length - suffix.length);
};

export const toggleInlineFormat = (
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string
): EditorResult => {
  const { start, end, selectedText } = getTextareaSelection(textarea);
  const value = textarea.value;

  if (selectedText && isWrappedWith(selectedText, prefix, suffix)) {
    const unwrapped = unwrap(selectedText, prefix, suffix);
    const newValue =
      value.substring(0, start) + unwrapped + value.substring(end);
    return {
      content: newValue,
      selectionStart: start,
      selectionEnd: start + unwrapped.length,
    };
  }

  const beforeStart = Math.max(0, start - prefix.length);
  const afterEnd = Math.min(value.length, end + suffix.length);
  const textBefore = value.substring(beforeStart, start);
  const textAfter = value.substring(end, afterEnd);

  if (textBefore === prefix && textAfter === suffix) {
    const newValue =
      value.substring(0, beforeStart) +
      selectedText +
      value.substring(afterEnd);
    return {
      content: newValue,
      selectionStart: beforeStart,
      selectionEnd: beforeStart + selectedText.length,
    };
  }

  if (selectedText) {
    const newValue =
      value.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      value.substring(end);
    return {
      content: newValue,
      selectionStart: start + prefix.length,
      selectionEnd: start + prefix.length + selectedText.length,
    };
  } else {
    const newValue =
      value.substring(0, start) + prefix + suffix + value.substring(end);
    return {
      content: newValue,
      selectionStart: start + prefix.length,
      selectionEnd: start + prefix.length,
    };
  }
};

export const wrapOrInsert = (
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string = "",
  placeholder: string = ""
): string => {
  const { selectedText } = getTextareaSelection(textarea);

  if (selectedText) {
    return insertTextAtCursor(textarea, prefix, suffix, selectedText);
  } else {
    const content = placeholder || "";
    const cursorOffset = placeholder ? -suffix.length : 0;
    return insertTextAtCursor(textarea, prefix, suffix, content, cursorOffset);
  }
};

export const insertBold = (textarea: HTMLTextAreaElement): string => {
  const result = toggleInlineFormat(textarea, "**", "**");
  textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
  return result.content;
};

export const insertItalic = (textarea: HTMLTextAreaElement): string => {
  const result = toggleInlineFormat(textarea, "*", "*");
  textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
  return result.content;
};

export const insertUnderline = (textarea: HTMLTextAreaElement): string => {
  const result = toggleInlineFormat(textarea, "<u>", "</u>");
  textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
  return result.content;
};

export const insertStrikethrough = (textarea: HTMLTextAreaElement): string => {
  const result = toggleInlineFormat(textarea, "~~", "~~");
  textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
  return result.content;
};

export const insertInlineCode = (textarea: HTMLTextAreaElement): string => {
  const result = toggleInlineFormat(textarea, "`", "`");
  textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
  return result.content;
};

const getLineAtPosition = (
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

const getHeadingLevel = (line: string): number => {
  const match = line.match(/^(#{1,6})\s/);
  return match ? match[1].length : 0;
};

export const insertHeading = (
  textarea: HTMLTextAreaElement,
  level: number = 2
): string => {
  const { start, end } = getTextareaSelection(textarea);
  const value = textarea.value;

  const { lineStart, lineEnd, lineContent } = getLineAtPosition(value, start);
  const currentLevel = getHeadingLevel(lineContent);
  const prefix = "#".repeat(level) + " ";

  let newLineContent: string;
  let newCursorPos: number;

  if (currentLevel === level) {
    newLineContent = lineContent.replace(/^#{1,6}\s/, "");
    newCursorPos = lineStart + Math.max(0, start - lineStart - prefix.length);
  } else if (currentLevel > 0) {
    newLineContent = lineContent.replace(/^#{1,6}\s/, prefix);
    newCursorPos =
      lineStart +
      prefix.length +
      Math.max(0, start - lineStart - currentLevel - 1);
  } else {
    newLineContent = prefix + lineContent;
    newCursorPos = start + prefix.length;
  }

  const newValue =
    value.substring(0, lineStart) + newLineContent + value.substring(lineEnd);

  newCursorPos = Math.min(newCursorPos, lineStart + newLineContent.length);
  newCursorPos = Math.max(newCursorPos, lineStart);

  textarea.setSelectionRange(newCursorPos, newCursorPos);
  return newValue;
};

const toggleLinePrefix = (
  textarea: HTMLTextAreaElement,
  prefixPattern: RegExp,
  prefix: string
): EditorResult => {
  const { start, end, selectedText } = getTextareaSelection(textarea);
  const value = textarea.value;

  const { lineStart } = getLineAtPosition(value, start);
  const { lineEnd } = getLineAtPosition(value, end);
  const linesContent = value.substring(lineStart, lineEnd);
  const lines = linesContent.split("\n");

  const allHavePrefix = lines.every(
    (line) => prefixPattern.test(line) || line.trim() === ""
  );

  let newLines: string[];

  if (allHavePrefix) {
    newLines = lines.map((line) => line.replace(prefixPattern, ""));
  } else {
    newLines = lines.map((line) => {
      if (line.trim() === "") return line;
      if (prefixPattern.test(line)) return line;
      return prefix + line;
    });
  }

  const newLinesContent = newLines.join("\n");
  const newValue =
    value.substring(0, lineStart) + newLinesContent + value.substring(lineEnd);

  let newStart = start;
  let newEnd = end;

  if (allHavePrefix) {
    const linesBeforeStart = value.substring(lineStart, start).split("\n");
    newStart = start - linesBeforeStart.length * prefix.length;
    newStart = Math.max(lineStart, newStart);

    if (selectedText) {
      const linesInSelection = selectedText.split("\n").length;
      newEnd =
        newStart + selectedText.length - linesInSelection * prefix.length;
    } else {
      newEnd = newStart;
    }
  } else {
    const firstLineHadPrefix = prefixPattern.test(lines[0]);
    if (!firstLineHadPrefix && lines[0].trim() !== "") {
      newStart = start + prefix.length;
    }
    if (selectedText) {
      const addedPrefixes = lines.filter(
        (line) => line.trim() !== "" && !prefixPattern.test(line)
      ).length;
      newEnd = end + addedPrefixes * prefix.length;
    } else {
      newEnd = newStart;
    }
  }

  return {
    content: newValue,
    selectionStart: newStart,
    selectionEnd: newEnd,
  };
};

export const insertBulletList = (textarea: HTMLTextAreaElement): string => {
  const result = toggleLinePrefix(textarea, /^-\s/, "- ");
  textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
  return result.content;
};

export const insertOrderedList = (textarea: HTMLTextAreaElement): string => {
  const { start, end } = getTextareaSelection(textarea);
  const value = textarea.value;

  const { lineStart } = getLineAtPosition(value, start);
  const { lineEnd } = getLineAtPosition(value, end);
  const linesContent = value.substring(lineStart, lineEnd);
  const lines = linesContent.split("\n");

  const orderedListPattern = /^\d+\.\s/;
  const allHavePrefix = lines.every(
    (line) => orderedListPattern.test(line) || line.trim() === ""
  );

  let newLines: string[];

  if (allHavePrefix) {
    newLines = lines.map((line) => line.replace(orderedListPattern, ""));
  } else {
    let num = 1;
    newLines = lines.map((line) => {
      if (line.trim() === "") return line;
      if (orderedListPattern.test(line)) {
        const content = line.replace(orderedListPattern, "");
        return `${num++}. ${content}`;
      }
      return `${num++}. ${line}`;
    });
  }

  const newLinesContent = newLines.join("\n");
  const newValue =
    value.substring(0, lineStart) + newLinesContent + value.substring(lineEnd);

  const newCursorPos = lineStart + newLines[0].length;
  textarea.setSelectionRange(newCursorPos, newCursorPos);

  return newValue;
};

export const insertTaskList = (textarea: HTMLTextAreaElement): string => {
  const { start, end } = getTextareaSelection(textarea);
  const value = textarea.value;

  const { lineStart } = getLineAtPosition(value, start);
  const { lineEnd } = getLineAtPosition(value, end);
  const linesContent = value.substring(lineStart, lineEnd);
  const lines = linesContent.split("\n");

  const taskListPattern = /^-\s\[[ x]\]\s/;
  const allHavePrefix = lines.every(
    (line) => taskListPattern.test(line) || line.trim() === ""
  );

  let newLines: string[];

  if (allHavePrefix) {
    newLines = lines.map((line) => line.replace(taskListPattern, ""));
  } else {
    newLines = lines.map((line) => {
      if (line.trim() === "") return line;
      if (taskListPattern.test(line)) return line;
      if (/^-\s/.test(line)) {
        return line.replace(/^-\s/, "- [ ] ");
      }
      if (/^-\s/.test(line)) {
        return line.replace(/^-\s/, "- [ ] ");
      }
      return `- [ ] ${line}`;
    });
  }

  const newLinesContent = newLines.join("\n");
  const newValue =
    value.substring(0, lineStart) + newLinesContent + value.substring(lineEnd);

  const newCursorPos = lineStart + newLines[0].length;
  textarea.setSelectionRange(newCursorPos, newCursorPos);

  return newValue;
};

export const insertBlockquote = (textarea: HTMLTextAreaElement): string => {
  const result = toggleLinePrefix(textarea, /^>\s/, "> ");
  textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
  return result.content;
};

export const insertLink = (
  textarea: HTMLTextAreaElement,
  url: string = ""
): string => {
  const { selectedText } = getTextareaSelection(textarea);

  if (selectedText) {
    return insertTextAtCursor(textarea, "[", `](${url})`, selectedText);
  } else {
    return insertTextAtCursor(textarea, "[", `](${url})`, "", -url.length - 3);
  }
};

export const insertImage = (
  textarea: HTMLTextAreaElement,
  url: string,
  alt: string = ""
): string => {
  return insertTextAtCursor(textarea, `![${alt}](`, ")", url, 0);
};

export const insertVideo = (
  textarea: HTMLTextAreaElement,
  url: string,
  filename: string
): string => {
  return insertTextAtCursor(textarea, `[🎥 ${filename}](`, ")", url, 0);
};

export const insertFile = (
  textarea: HTMLTextAreaElement,
  url: string,
  filename: string
): string => {
  return insertTextAtCursor(textarea, `[📎 ${filename}](`, ")", url, 0);
};

export const insertCodeBlock = (
  textarea: HTMLTextAreaElement,
  language: string = ""
): string => {
  const { selectedText } = getTextareaSelection(textarea);

  const opening = "```" + language + "\n";
  const closing = "\n```\n";

  if (selectedText) {
    return insertTextAtCursor(textarea, opening, closing, selectedText);
  } else {
    return insertTextAtCursor(
      textarea,
      opening,
      closing,
      "",
      -closing.length + 1
    );
  }
};

export const insertMermaid = (
  textarea: HTMLTextAreaElement,
  content?: string
): string => {
  const defaultContent =
    content ||
    `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Option 1]
    B -->|No| D[Option 2]
    C --> E[End]
    D --> E`;

  const opening = "```mermaid\n";
  const closing = "\n```\n";

  return insertTextAtCursor(textarea, opening, closing, defaultContent, 0);
};

export const insertHighlight = (textarea: HTMLTextAreaElement): string => {
  return wrapOrInsert(textarea, "<mark>", "</mark>", "");
};

export const insertSubscript = (textarea: HTMLTextAreaElement): string => {
  return wrapOrInsert(textarea, "<sub>", "</sub>", "");
};

export const insertSuperscript = (textarea: HTMLTextAreaElement): string => {
  return wrapOrInsert(textarea, "<sup>", "</sup>", "");
};

export const insertAbbreviation = (
  textarea: HTMLTextAreaElement,
  title: string
): string => {
  return wrapOrInsert(textarea, `<abbr title="${title}">`, "</abbr>", "");
};

export const insertDetails = (
  textarea: HTMLTextAreaElement,
  summary: string = "Details"
): string => {
  const { selectedText } = getTextareaSelection(textarea);

  const opening = `<details>\n<summary>${summary}</summary>\n\n`;
  const closing = `\n\n</details>\n`;

  if (selectedText) {
    return insertTextAtCursor(textarea, opening, closing, selectedText);
  } else {
    return insertTextAtCursor(
      textarea,
      opening,
      closing,
      "",
      -closing.length + 3
    );
  }
};

export const insertTable = (
  textarea: HTMLTextAreaElement,
  rows: number = 3,
  cols: number = 3
): string => {
  const header = "| " + Array(cols).fill("Header").join(" | ") + " |\n";
  const separator = "| " + Array(cols).fill("---").join(" | ") + " |\n";
  const bodyRows = Array(rows - 1)
    .fill(null)
    .map(() => "| " + Array(cols).fill("Cell").join(" | ") + " |\n")
    .join("");

  const table = "\n" + header + separator + bodyRows + "\n";

  return insertTextAtCursor(textarea, table, "", "", 0);
};

export const insertInternalLink = (
  textarea: HTMLTextAreaElement,
  title: string,
  href: string
): string => {
  return insertTextAtCursor(textarea, `[${title}](`, ")", href, 0);
};
