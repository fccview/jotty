type Random = () => number;
type Fragment = (random: Random, depth: number) => string;

export const seeded = (seed: number): Random => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = <T,>(random: Random, items: T[]) => items[Math.floor(random() * items.length)];

const between = (random: Random, min: number, max: number) => min + Math.floor(random() * (max - min + 1));

const WORDS = [
  "alpha", "beta", "gamma", "note", "list", "Ø", "naïve", "5*3", "a+b", "snake_case", "C:\\Users",
  "50%", "$5", "a & b", "x > y", "<3", "(paren)", "end.", "#tag", "#nested/tag", "issue #12", "😀",
  "[[Wiki Note]]", "under_score_", "a|b", "1.", "2)", "~approx", "it's", "\"quoted\"",
  "&copy;", "\\*kept\\*", "x^2", "path/to/file.md", "trailing\\", "{braces}",
];

const plainWord: Fragment = (random) => pick(random, WORDS);

const words = (random: Random, count: number) =>
  Array.from({ length: count }, () => plainWord(random, 0)).join(" ");

const MARKED: Fragment[] = [
  (random) => `**${words(random, between(random, 1, 3))}**`,
  (random) => `*${words(random, between(random, 1, 2))}*`,
  (random) => `~~${words(random, 1)}~~`,
  (random) => `**bold *nested ${words(random, 1)}* tail**`,
  (random) => `\`${pick(random, ["code", "a*b", "x | y", "$HOME", "a`b"])}\``,
  (random) => `[${words(random, 2)}](https://example.com/${pick(random, ["a", "b_c", "d?e=f"])})`,
  () => "<https://auto.example.com>",
  () => "https://bare.example.com/path",
  () => "[Linked note](/jotty/123e4567-e89b-42d3-a456-426614174000)",
  (random) => `<u>${words(random, 1)}</u>`,
  (random) => `<mark>${words(random, 1)}</mark>`,
  (random) => `<span style="color: #ff0000">${words(random, 1)}</span>`,
  (random) => `<kbd>${pick(random, ["Ctrl", "Alt"])}</kbd>`,
  () => "H<sub>2</sub>O",
  (random) => `<small>${words(random, 1)}</small>`,
  () => '<abbr title="Hyper Text">HT</abbr>',
  (random) => `_${words(random, 1)}_`,
  (random) => `***${words(random, 1)}***`,
  (random) => `[${words(random, 1)}](https://example.com "A title")`,
  () => "text[^1]",
  () => "a<br>b",
  () => "<!-- inline -->",
  (random) => `<b>${words(random, 1)}</b>`,
];

const inline = (random: Random, count: number) => {
  const parts: string[] = [];
  for (let index = 0; index < count; index++) {
    parts.push(random() < 0.4 ? pick(random, MARKED)(random, 0) : plainWord(random, 0));
  }
  return parts.join(" ").trim();
};

const lineBreaks = (random: Random) => {
  const lines = Array.from({ length: between(random, 1, 3) }, () => `${pick(random, ["Line", "Next"])} ${inline(random, between(random, 1, 4))}`);
  return lines.reduce((text, line, index) => (index === 0 ? line : `${text}${random() < 0.5 ? "\n" : "  \n"}${line}`), "");
};

const listItems = (random: Random, depth: number, marker: (index: number) => string): string => {
  const count = between(random, 1, 3);
  const indent = "  ".repeat(depth);
  return Array.from({ length: count }, (_unused, index) => {
    const prefix = marker(index);
    const line = `${indent}${prefix}${inline(random, between(random, 1, 3))}`;
    if (depth < 2 && random() < 0.3) {
      const child = random() < 0.5 ? (i: number) => `${i + 1}. ` : () => "- ";
      return `${line}\n${listItems(random, depth + 1, child).replace(/^/gm, " ".repeat(prefix.length - 2))}`;
    }
    return line;
  }).join("\n");
};

const tableCell = (random: Random) =>
  pick(random, [words(random, 1), `**${words(random, 1)}**`, "`a\\|b`", "x \\| y", "one<br>two", ""]);

const markdownTable = (random: Random) => {
  const cols = between(random, 1, 3);
  const row = () => `| ${Array.from({ length: cols }, () => tableCell(random)).join(" | ")} |`;
  const rule = `| ${Array.from({ length: cols }, () => pick(random, ["---", ":--", "--:", ":-:"])).join(" | ")} |`;
  return [row(), rule, ...Array.from({ length: between(random, 0, 2) }, row)].join("\n");
};

const BLOCKS: Fragment[] = [
  (random) => inline(random, between(random, 2, 8)),
  (random) => inline(random, between(random, 2, 8)),
  (random) => lineBreaks(random),
  (random) => `${"#".repeat(between(random, 1, 6))} ${inline(random, between(random, 1, 3))}`,
  (random, depth) => listItems(random, depth, () => "- "),
  (random, depth) => listItems(random, depth, (index) => `${index + 1}. `),
  (random) => Array.from({ length: between(random, 1, 3) }, () => `- [${random() < 0.5 ? "x" : " "}] ${inline(random, 2)}`).join("\n"),
  (random) => `> ${lineBreaks(random).replace(/\n/g, "\n> ")}`,
  (random) => `> [!${pick(random, ["INFO", "WARNING", "TIP", "DANGER"])}]\n> ${inline(random, 3)}`,
  (random) => `\`\`\`${pick(random, ["", "js", "bash"])}\nconst x = ${pick(random, ["1", "'$&'", "a\\\nb"])};\n\nreturn x;\n\`\`\``,
  (random) => markdownTable(random),
  (random) => `<table>\n  <tr>\n    <td>${words(random, 1)}</td>\n    <td colspan="2">${words(random, 1)}</td>\n  </tr>\n</table>`,
  (random) => pick(random, ["<div>raw block</div>", '<p align="center">centred</p>', "<!-- note comment -->", "<video src=\"/v.mp4\"></video>"]),
  () => "---",
  (random) => `![${words(random, 1).replace(/[[\]]/g, "")}](/api/image/u/${pick(random, ["a.png", "b%20c.png"])})`,
  () => '<img src="/api/image/u/p.png" alt="p" style="width: 200px; height: 100px" />',
  (random) => `<details>\n<summary>More</summary>\n\n${inline(random, 3)}\n\n</details>`,
  () => "```mermaid\ngraph TD\n  A --- B\n```",
  () => "&nbsp;",
  () => "\u200b",
  () => "[^1]: the footnote",
  (random) => `${words(random, 2)}\n${"=".repeat(between(random, 1, 4))}`,
  (random) => `+ ${inline(random, 2)}\n+ ${inline(random, 2)}`,
  (random) => `1) ${inline(random, 2)}\n2) ${inline(random, 2)}`,
  (random) => `    indented ${words(random, 1)}`,
];

export const randomDocument = (random: Random) =>
  Array.from({ length: between(random, 1, 7) }, () => pick(random, BLOCKS)(random, 0)).join("\n\n");
