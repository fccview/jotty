// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { freshSave, reloadedJson } from "./harness";
import { expectRoundtrip, markTypes } from "./properties";

const corpus: Record<string, string> = {
  headings: "# One\n\n## Two\n\n###### Six",
  paragraphs: "Hello world\n\nSecond paragraph",
  softBreak: "line one\nline two",
  hardBreak: "line one  \nline two",
  emphasis: "**bold** *italic* ~~strike~~ `code` ***both***",
  underscoreEmphasis: "_italic_ and __bold__ words",
  nestedMarks: "**bold *and italic* inside** done",
  specialChars: "1. not a list? price is 5*3 and a+b, use #hash? <3 & a > b",
  escapes: "literal \\*stars\\* and \\_under\\_ and \\[brackets\\]",
  numberedStart: "1999\\. A great year",
  bullets: "- one\n- two\n  - nested\n  - nested two\n- three",
  ordered: "1. one\n2. two\n3. three",
  orderedStart: "3. three\n4. four",
  orderedParen: "1) one\n2) two",
  mixedNested: "1. one\n   - a\n   - b\n2. two",
  deepNested: "- one\n  - two\n    - three\n      - four",
  tasks: "- [ ] todo\n- [x] done\n  - [ ] nested",
  taskWithMarks: "- [ ] buy *milk* and `eggs`",
  blockquote: "> quoted\n> more",
  nestedQuote: "> outer\n>\n> > inner",
  quoteWithList: "> - one\n> - two",
  codeFence: "```js\nconst a = 1;\n\nconst b = `x`;\n```",
  codePlain: "```\nplain\n```",
  codeTilde: "~~~\ntilde\n~~~",
  indentedCode: "    indented code",
  longFence: "````\n```\nnested fence\n```\n````",
  inlineBackticks: "use `` a`b `` here",
  rule: "above\n\n---\n\nbelow",
  starRule: "above\n\n***\n\nbelow",
  links: "[Jotty](https://example.com) and <https://auto.link>",
  linkTitle: "[t](https://e.com \"title\")",
  bareUrl: "visit https://example.com today",
  mailto: "write to <mailto:me@example.com>",
  image: "![alt text](/api/image/user/pic.png)",
  imageTitle: "![alt](/api/image/u/p.png \"A title\")",
  mermaid: "```mermaid\ngraph TD\n  A-->B\n```",
  tags: "hello #world and #nested/tag",
  headingTag: "# Title #tag",
  internalLink: "[My note](/jotty/123e4567-e89b-42d3-a456-426614174000)",
  wikilink: "see [[Some Note]] here",
  attachment: "[📎 file.pdf](/api/file/user/file.pdf)",
  video: "[🎥 clip.mp4](/api/video/user/clip.mp4)",
  emoji: "😀 unicode text",
  trailingNewline: "text\n",
  leadingBlankLines: "\n\ntext",
  leadingSpaces: "   indented text",
  looseList: "- one\n\n- two",
  headingInList: "- # heading in list",
  quoteInList: "- item\n\n  > quote",
  dollars: "costs $5 and $10",
  starBullets: "* star bullet\n* another",
  plusBullets: "+ plus\n+ bullets",
  setext: "Title\n=====",
  setextTwo: "Title\n-----",
  hashInText: "issue #123 and C# code",
  emptyDocument: "",
};

describe("roundtrip", () => {
  it.each(Object.entries(corpus))("%s keeps its bytes and never drifts", (_name, markdown) => {
    expectRoundtrip(markdown);
  });
});

describe("accepted normalisations", () => {
  it("moves trailing whitespace inside a bold mark to after the mark", () => {
    const markdown = "a <b> not tag </b>?";
    const fresh = freshSave(markdown);
    expect(fresh).toBe("a **not tag** ?");
    expect(freshSave(fresh)).toBe(fresh);
    expect(markTypes(reloadedJson(fresh))).toEqual(["bold"]);
  });

  it("writes every thematic break as three dashes on a fresh save", () => {
    expect(freshSave("above\n\n***\n\nbelow")).toBe("above\n\n---\n\nbelow");
  });
});
