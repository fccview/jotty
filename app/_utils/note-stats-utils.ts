import { CARD_PLAIN_RULES, stripMarkdown } from "@/app/_utils/markdown/plain-text";

const WORDS_PER_MINUTE = 225;

export const readingTimeOf = (wordCount: number): number =>
  Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));

const tableTextOf = (content: string): string =>
  (content.match(/\|(.+)\|/g) || [])
    .filter((row) => !row.match(/^\|[\s-:|]+\|$/))
    .map((row) =>
      row
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0)
        .join(" "),
    )
    .join(" ");

export const notePlainText = (content: string): string => {
  const body = content.replace(/^---\n[\s\S]*?\n---\n/, "");
  return `${stripMarkdown(body, CARD_PLAIN_RULES)} ${tableTextOf(body)}`;
};

export const noteStats = (content: string) => {
  const plainText = notePlainText(content);
  const words = plainText
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0 && word !== "​");

  return {
    excerpt: plainText.replace(/\s+/g, " ").trim(),
    wordCount: words.length,
    charCount: plainText.replace(/\s+/g, "").length,
    readingTime: readingTimeOf(words.length),
  };
};
