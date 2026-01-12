export interface TextareaSelection {
  start: number;
  end: number;
  selectedText: string;
}

export const getTextareaSelection = (textarea: HTMLTextAreaElement): TextareaSelection => {
  return {
    start: textarea.selectionStart,
    end: textarea.selectionEnd,
    selectedText: textarea.value.substring(textarea.selectionStart, textarea.selectionEnd),
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

  const newCursorPos = start + textBefore.length + selectedText.length + cursorOffset;

  textarea.setSelectionRange(newCursorPos, newCursorPos);

  return newValue;
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
  return wrapOrInsert(textarea, "**", "**", "");
};

export const insertItalic = (textarea: HTMLTextAreaElement): string => {
  return wrapOrInsert(textarea, "*", "*", "");
};

export const insertUnderline = (textarea: HTMLTextAreaElement): string => {
  return wrapOrInsert(textarea, "<u>", "</u>", "");
};

export const insertStrikethrough = (textarea: HTMLTextAreaElement): string => {
  return wrapOrInsert(textarea, "~~", "~~", "");
};

export const insertInlineCode = (textarea: HTMLTextAreaElement): string => {
  return wrapOrInsert(textarea, "`", "`", "");
};

export const insertHeading = (textarea: HTMLTextAreaElement, level: number = 2): string => {
  const { start, selectedText } = getTextareaSelection(textarea);
  const value = textarea.value;

  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const isAtLineStart = start === lineStart;

  const prefix = "#".repeat(level) + " ";

  if (isAtLineStart || !selectedText) {
    return insertTextAtCursor(textarea, prefix, "", selectedText);
  } else {
    return insertTextAtCursor(textarea, "\n" + prefix, "\n", selectedText);
  }
};

export const insertBulletList = (textarea: HTMLTextAreaElement): string => {
  const { start, selectedText } = getTextareaSelection(textarea);
  const value = textarea.value;

  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const isAtLineStart = start === lineStart;

  if (selectedText && selectedText.includes("\n")) {
    const lines = selectedText.split("\n");
    const bulletedLines = lines.map(line => line.trim() ? `- ${line}` : line).join("\n");
    return insertTextAtCursor(textarea, "", "", bulletedLines);
  } else if (isAtLineStart || !selectedText) {
    return insertTextAtCursor(textarea, "- ", "", selectedText);
  } else {
    return insertTextAtCursor(textarea, "\n- ", "", selectedText);
  }
};

export const insertBlockquote = (textarea: HTMLTextAreaElement): string => {
  const { start, selectedText } = getTextareaSelection(textarea);
  const value = textarea.value;

  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const isAtLineStart = start === lineStart;

  if (selectedText && selectedText.includes("\n")) {
    const lines = selectedText.split("\n");
    const quotedLines = lines.map(line => `> ${line}`).join("\n");
    return insertTextAtCursor(textarea, "", "", quotedLines);
  } else if (isAtLineStart || !selectedText) {
    return insertTextAtCursor(textarea, "> ", "", selectedText);
  } else {
    return insertTextAtCursor(textarea, "\n> ", "", selectedText);
  }
};

export const insertLink = (textarea: HTMLTextAreaElement, url: string = ""): string => {
  const { selectedText } = getTextareaSelection(textarea);

  if (selectedText) {
    return insertTextAtCursor(textarea, "[", `](${url})`, selectedText);
  } else {
    return insertTextAtCursor(textarea, "[", `](${url})`, "", -url.length - 3);
  }
};

export const insertImage = (textarea: HTMLTextAreaElement, url: string, alt: string = ""): string => {
  return insertTextAtCursor(textarea, `![${alt}](`, ")", url, 0);
};

export const insertVideo = (textarea: HTMLTextAreaElement, url: string, filename: string): string => {
  return insertTextAtCursor(textarea, `[🎥 ${filename}](`, ")", url, 0);
};

export const insertFile = (textarea: HTMLTextAreaElement, url: string, filename: string): string => {
  return insertTextAtCursor(textarea, `[📎 ${filename}](`, ")", url, 0);
};

export const insertCodeBlock = (textarea: HTMLTextAreaElement, language: string = ""): string => {
  const { selectedText } = getTextareaSelection(textarea);

  const opening = "```" + language + "\n";
  const closing = "\n```\n";

  if (selectedText) {
    return insertTextAtCursor(textarea, opening, closing, selectedText);
  } else {
    return insertTextAtCursor(textarea, opening, closing, "", -closing.length + 1);
  }
};

export const insertMermaid = (textarea: HTMLTextAreaElement, content?: string): string => {
  const defaultContent = content || `graph TD
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

export const insertAbbreviation = (textarea: HTMLTextAreaElement, title: string): string => {
  return wrapOrInsert(textarea, `<abbr title="${title}">`, "</abbr>", "");
};

export const insertDetails = (textarea: HTMLTextAreaElement, summary: string = "Details"): string => {
  const { selectedText } = getTextareaSelection(textarea);

  const opening = `<details>\n<summary>${summary}</summary>\n\n`;
  const closing = `\n\n</details>\n`;

  if (selectedText) {
    return insertTextAtCursor(textarea, opening, closing, selectedText);
  } else {
    return insertTextAtCursor(textarea, opening, closing, "", -closing.length + 3);
  }
};

export const insertTable = (textarea: HTMLTextAreaElement, rows: number = 3, cols: number = 3): string => {
  const header = "| " + Array(cols).fill("Header").join(" | ") + " |\n";
  const separator = "| " + Array(cols).fill("---").join(" | ") + " |\n";
  const bodyRows = Array(rows - 1)
    .fill(null)
    .map(() => "| " + Array(cols).fill("Cell").join(" | ") + " |\n")
    .join("");

  const table = "\n" + header + separator + bodyRows + "\n";

  return insertTextAtCursor(textarea, table, "", "", 0);
};

export const insertInternalLink = (textarea: HTMLTextAreaElement, title: string, href: string): string => {
  return insertTextAtCursor(textarea, `[${title}](`, ")", href, 0);
};
