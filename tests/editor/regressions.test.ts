// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { freshSave, open, unchangedSave } from "./harness";
import { blockTypes, expectRoundtrip, expectStable, findAll, findOne, textOf } from "./properties";

const BASH = "```bash\necho $'a\\tb'\nsed 's/x/$&/' \\\n  file.txt\nprintf '%s\\n' \"$@\"\n```";
const DRAWIO = "<!-- drawio-diagram\ndata: PG14Pg==\nsvg: PHN2Zz48L3N2Zz4=\ntheme: light\n-->";

describe("regressions", () => {
  it("keeps a loose list item paragraph inside its item", () => {
    const markdown = "- one\n\n  continued para\n- two";
    expectRoundtrip(markdown);
    const [first] = findAll(open(markdown).json, "listItem");
    expect(blockTypes(first)).toEqual(["paragraph", "paragraph"]);
    expect(textOf(first)).toBe("onecontinued para");
  });

  it("keeps nested tasks separated by a blank line together", () => {
    const markdown = "- [ ] a\n  - [ ] b\n\n- [ ] c";
    expectRoundtrip(markdown);
    expect(blockTypes(open(markdown).json)).toEqual(["taskList", "paragraph"]);
    expect(findAll(open(markdown).json, "taskItem")).toHaveLength(3);
  });

  it("keeps checked state of nested tasks", () => {
    const markdown = "- [ ] parent\n  - [x] child\n  - [ ] child two\n- [ ] next";
    expectRoundtrip(markdown);
    expect(findAll(open(markdown).json, "taskItem").map((node) => node.attrs?.checked)).toEqual([false, true, false, false]);
  });

  it.each([
    ["paragraph", "line one\nline two\nline three"],
    ["blockquote", "> quote one\n> quote two"],
    ["callout", "> [!INFO]\n> line one\n> line two"],
    ["list item", "- line one\n  line two"],
  ])("keeps soft line breaks in a %s", (_name, markdown) => {
    expect(freshSave(markdown)).toBe(markdown);
    expectRoundtrip(markdown);
  });

  it("keeps snake_case words unescaped", () => {
    const markdown = "my_snake_case_var in file_name.txt";
    expect(freshSave(markdown)).toBe(markdown);
    expectRoundtrip(markdown);
  });

  it("keeps an escaped dunder name as literal text", () => {
    const markdown = "call \\_\\_init\\_\\_ now";
    expectRoundtrip(markdown);
    expect(textOf(open(markdown).json)).toBe("call __init__ now");
  });

  it("reads an unescaped dunder name as bold like the viewer does", () => {
    expect(findOne(open("call __init__ now").json, "text").marks).toBeUndefined();
    expect(findAll(open("call __init__ now").json, "text")[1].marks).toEqual([{ type: "bold" }]);
  });

  it.each([
    ["multiplication", "5*3 = 15 and 2 * 4"],
    ["windows path", "C:\\Users\\me"],
    ["trailing backslash", "path C:\\Users\\me\\"],
    ["prices", "costs $5 and $10"],
    ["plus and ampersand", "a+b & c"],
  ])("does not over escape %s", (_name, markdown) => {
    expect(freshSave(markdown)).toBe(markdown);
    expectRoundtrip(markdown);
  });

  it("keeps strikethrough", () => {
    expect(freshSave("~~strike~~ text")).toBe("~~strike~~ text");
    expect(findOne(open("~~strike~~ text").json, "text").marks).toEqual([{ type: "strike" }]);
  });

  it("closes colour spans so the colour does not leak into the rest of the note", () => {
    const markdown = '<span style="color: #ff0000">red</span> plain';
    const json = open(freshSave(markdown)).json;
    expect(findAll(json, "text")[1]).toEqual({ type: "text", text: " plain" });
  });

  it("keeps the colours of a styled mark", () => {
    const markdown = '<mark style="background-color: #ffff00; color: #000000">yellow</mark>';
    expect(freshSave(markdown)).toBe(markdown);
  });

  it("keeps footnotes as raw markdown", () => {
    const markdown = "text[^1] more[^note]\n\n[^1]: first\n[^note]: second **bold**";
    expectRoundtrip(markdown);
    expect(findAll(open(markdown).json, "rawInline").map((node) => node.attrs?.source)).toEqual(["[^1]", "[^note]"]);
    expect(findAll(open(markdown).json, "rawBlock").map((node) => node.attrs?.source)).toEqual([
      "[^1]: first",
      "[^note]: second **bold**",
    ]);
  });

  it("separates footnote definitions with a blank line on a fresh save", () => {
    expect(freshSave("text[^1]\n\n[^1]: first\n[^2]: second")).toBe("text[^1]\n\n[^1]: first\n\n[^2]: second");
  });

  it("keeps reference links as raw markdown", () => {
    const markdown = "see [docs][d]\n\n[d]: https://example.com";
    expectRoundtrip(markdown);
    expect(freshSave(markdown)).toBe(markdown);
  });

  it("keeps entities", () => {
    const markdown = "&copy; &amp; &lt;tag&gt; &#169; &nbsp; x";
    expectRoundtrip(markdown);
    expect(textOf(open(markdown).json)).toBe("© & <tag> © \u00a0 x");
  });

  it("keeps bash quoting, replacement tokens and line continuations (#435)", () => {
    expectRoundtrip(BASH);
    expect(freshSave(BASH)).toBe(BASH);
    expect(textOf(findOne(open(BASH).json, "codeBlock"))).toContain("$&");
  });

  it("keeps an image only note (#364)", () => {
    const markdown = "![only](/api/image/u/only.png)";
    expectRoundtrip(markdown);
    expect(freshSave(markdown)).toBe(markdown);
    expect(blockTypes(open(markdown).json)[0]).toBe("image");
  });

  it("keeps a drawio only note", () => {
    expectRoundtrip(DRAWIO);
    expect(freshSave(DRAWIO)).toBe(DRAWIO);
  });

  it("does not turn bullets followed by tasks into tasks (#122)", () => {
    const markdown = "- a\n- b\n- [ ] c\n- [ ] d";
    expectRoundtrip(markdown);
    const json = open(markdown).json;
    expect(blockTypes(json).slice(0, 2)).toEqual(["bulletList", "taskList"]);
    const fresh = expectStable(markdown);
    expect(blockTypes(open(fresh).json).slice(0, 2)).toEqual(["bulletList", "taskList"]);
  });

  it("keeps a code block inside a list item", () => {
    const markdown = "- item\n\n  ```js\n  const x = 1;\n  ```";
    expectRoundtrip(markdown);
    expect(findOne(findOne(open(markdown).json, "listItem"), "codeBlock").attrs?.language).toBe("js");
  });

  it("keeps blank lines inside a code block (#198)", () => {
    const markdown = "```\nline one\n\n\nline four\n```";
    expectRoundtrip(markdown);
    expect(textOf(findOne(open(markdown).json, "codeBlock"))).toBe("line one\n\n\nline four");
  });

  it("keeps unlabelled, tilde and indented code", () => {
    const markdown = "```\nunlabelled\n```\n\n~~~\ntilde\n~~~\n\n    indented";
    expectRoundtrip(markdown);
    expect(findAll(open(markdown).json, "codeBlock").map(textOf)).toEqual(["unlabelled", "tilde", "indented"]);
  });

  it("keeps tel links (#550)", () => {
    const markdown = "[Call me](tel:+441234567890)";
    expectRoundtrip(markdown);
    expect(freshSave(markdown)).toBe(markdown);
  });

  it("keeps an image path with spaces written with angle brackets (#494)", () => {
    const markdown = "![my pic](</api/image/u/my pic.png>)";
    expectRoundtrip(markdown);
    expect(findOne(open(markdown).json, "image").attrs?.src).toBe("/api/image/u/my%20pic.png");
  });

  it("writes an image path with spaces percent encoded on a fresh save (#494)", () => {
    expect(freshSave("![my pic](</api/image/u/my pic.png>)")).toBe("![my pic](/api/image/u/my%20pic.png)");
    expectRoundtrip("![my pic](/api/image/u/my%20pic.png)");
  });

  it("keeps empty paragraphs in the middle of a note", () => {
    const markdown = "one\n\n&nbsp;\n\n&nbsp;\n\ntwo";
    expectRoundtrip(markdown);
    expect(blockTypes(open(markdown).json)).toEqual(["paragraph", "paragraph", "paragraph", "paragraph"]);
  });

  it("keeps trailing empty paragraphs on an unchanged save", () => {
    expect(unchangedSave("one\n\n&nbsp;\n\n&nbsp;")).toBe("one\n\n&nbsp;\n\n&nbsp;");
  });

  it("trims trailing empty paragraphs on a fresh save", () => {
    expect(freshSave("one\n\n&nbsp;\n\n&nbsp;")).toBe("one");
    expect(freshSave("one\n\n\u200b\n")).toBe("one");
  });

  it("reads CRLF input and writes LF", () => {
    const markdown = "a\r\nb\r\n\r\nc";
    expect(unchangedSave(markdown)).toBe("a\nb\n\nc");
    expectStable(markdown);
  });

  it("keeps mailto autolinks as autolinks", () => {
    const markdown = "write to <mailto:me@example.com>";
    expectRoundtrip(markdown);
    expect(freshSave(markdown)).toBe(markdown);
  });

  it("keeps text that looks like a thematic break or setext underline as text", () => {
    const markdown = "a\n\\---\n\n\\- - -\n\nb\n\\===";
    expectRoundtrip(markdown);
    expect(blockTypes(open(markdown).json)).toEqual(["paragraph", "paragraph", "paragraph"]);
  });
});

describe("generator findings", () => {
  it.each([
    ["italic around a code span", "x *a `c` b* y"],
    ["italic opened by an intraword star across code and a link", "5*3 note `a*b` https://bare.example.com/path 5*3"],
    ["bold italic ending in an escaped star", "***trailing\\*** 5*3"],
    ["emphasis crossing an html underline", "5*3 <u>5*3</u> tail"],
    ["emphasis crossing an html mark", "5*3 <mark>5*3</mark> tail"],
    ["pipes in a paragraph with html line breaks", "| one<br>two | **a|b** |\n| --: | --: |"],
    ["image alt with stars and brackets", "![\\*kept\\* \\[x\\]](/api/image/u/a.png)"],
    ["misnested html tags", "<u><b>x</u></b> y"],
  ])("%s never drifts and reloads identically", (_name, markdown) => {
    expectRoundtrip(markdown);
  });

  it("keeps html tags that cross emphasis as raw html", () => {
    expect(findAll(open("5*3 <u>5*3</u> tail").json, "rawInline").map((node) => node.attrs?.source)).toEqual([
      "<u>",
      "</u>",
    ]);
  });

  it("keeps italic open across a code span on a fresh save", () => {
    expect(freshSave("x *a `c` b* y")).toBe("x *a `c` b* y");
  });

  it("opens the longer running mark first", () => {
    expect(freshSave("***trailing\\*** 5*3")).toBe("***trailing\\*** 5*3");
  });
});

