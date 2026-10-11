const WORDS_PER_MINUTE = 225;

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

  return (
    body
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`]+`/g, " ")
      .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\|.+\|/g, " ")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/[*_]{1,3}/g, "")
      .replace(/^>\s+/gm, "")
      .replace(/^[-*_]{3,}$/gm, " ")
      .replace(/^[\s]*[-*+]\s+/gm, "")
      .replace(/^[\s]*\d+\.\s+/gm, "")
      .replace(/^[\s]*-?\s*\[[ xX]\]\s+/gm, "")
      .replace(/\[\s*\]\([^)]+\)/g, " ") +
    " " +
    tableTextOf(body)
  );
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
    readingTime: Math.max(1, Math.ceil(words.length / WORDS_PER_MINUTE)),
  };
};
