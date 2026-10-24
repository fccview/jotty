// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { freshSave, open } from "./harness";
import { expectRoundtrip, expectStable, findAll, findOne, textOf } from "./properties";

const cellTexts = (markdown: string) =>
  [...findAll(open(markdown).json, "tableHeader"), ...findAll(open(markdown).json, "tableCell")].map(textOf);

describe("markdown tables", () => {
  it.each([
    ["plain", "| a | b |\n| --- | --- |\n| 1 | 2 |"],
    ["aligned", "| left | center | right |\n| :--- | :---: | ---: |\n| a | b | c |"],
    ["non ascii", "| Ø | ü |\n| --- | --- |\n| ß | é |"],
    ["line break in a cell", "| a | b |\n| --- | --- |\n| one<br>two | x |"],
    ["escaped pipe and pipe in code", "| a | b |\n| --- | --- |\n| x \\| y | `c\\|d` |"],
    ["marks in cells", "| **bold** | *it* |\n| --- | --- |\n| [link](https://e.com) | `code` |"],
    ["empty cells", "| a | |\n| --- | --- |\n| | b |"],
    ["header only", "| a | b |\n| --- | --- |"],
  ])("%s keeps its bytes and never drifts", (_name, markdown) => {
    expectRoundtrip(markdown);
  });

  it("keeps column alignment on a fresh save", () => {
    const fresh = freshSave("| left | center | right |\n| :--- | :---: | ---: |\n| a | b | c |");
    expect(fresh.split("\n")[1]).toMatch(/^\| :-+ \| :-+: \| -+: \|$/);
  });

  it("keeps non ascii text in cells", () => {
    expect(cellTexts("| Ø | ü |\n| --- | --- |\n| ß | é |")).toEqual(["Ø", "ü", "ß", "é"]);
  });

  it("keeps a line break inside a cell as a br", () => {
    const fresh = freshSave("| a | b |\n| --- | --- |\n| one<br>two | x |");
    expect(fresh).toContain("one<br>two");
    expect(findAll(open(fresh).json, "hardBreak")).toHaveLength(1);
  });

  it("keeps escaped pipes and pipes inside code", () => {
    const markdown = "| a | b |\n| --- | --- |\n| x \\| y | `c\\|d` |";
    expect(cellTexts(markdown)).toEqual(["a", "b", "x | y", "c|d"]);
    expect(freshSave(markdown)).toContain("x \\| y");
    expect(freshSave(markdown)).toContain("`c\\|d`");
  });

  it("writes a markdown table as html when the user prefers html tables", () => {
    const markdown = "| a | b |\n| --- | --- |\n| 1 | 2 |";
    const html = expectStable(markdown, "html");
    expect(html).toMatch(/^<table>/);
    expect(cellTexts(html)).toEqual(["a", "b", "1", "2"]);
  });
});

describe("html tables", () => {
  const simple = "<table>\n  <tbody>\n    <tr>\n      <td>a</td>\n      <td>b</td>\n    </tr>\n  </tbody>\n</table>";
  const spanned = "<table>\n  <tbody>\n    <tr>\n      <th>H</th>\n      <th>I</th>\n    </tr>\n    <tr>\n      <td colspan=\"2\">span</td>\n    </tr>\n  </tbody>\n</table>";
  const rich = "<table>\n  <tr>\n    <td><strong>bold</strong> cell</td>\n    <td><ul><li>list</li></ul></td>\n  </tr>\n</table>";

  it.each([
    ["headerless", simple],
    ["spanned", spanned],
    ["rich cells", rich],
    ["one line", "<table><tr><td>one line</td></tr></table>"],
    ["between paragraphs", "before\n\n<table>\n<tr><td>a</td></tr>\n</table>\n\nafter"],
    ["malformed header row", "<table>\n<thead>\n<tr><th>H</th></tr>\n</thead>\n<tbody>\n<tr><td colspan=\"2\">span</td></tr>\n</tbody>\n</table>"],
    ["wrapped in a div (#421)", "<div style=\"overflow-x: auto\">\n<table>\n<tr><td>a</td></tr>\n</table>\n</div>"],
  ])("%s keeps its bytes and never drifts", (_name, markdown) => {
    expectRoundtrip(markdown);
  });

  it.each([
    ["headerless", simple],
    ["spanned", spanned],
    ["rich cells", rich],
  ])("stays html on a fresh save when it is %s", (_name, markdown) => {
    expect(freshSave(markdown)).toMatch(/^<table>/);
  });

  it("keeps the colspan on a fresh save", () => {
    expect(findOne(open(freshSave(spanned)).json, "tableCell").attrs?.colspan).toBe(2);
  });

  it("keeps a div wrapped html table as one raw block (#421)", () => {
    const markdown = '<div style="overflow-x: auto">\n<table>\n<tr><td>a</td></tr>\n</table>\n</div>';
    expect(findOne(open(markdown).json, "rawBlock").attrs?.source).toBe(markdown);
    expect(freshSave(markdown)).toBe(markdown);
  });

  it("keeps a markdown table inside a div wrapper editable between raw tags", () => {
    const markdown = '<div style="overflow-x: auto">\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\n</div>';
    expectRoundtrip(markdown);
    expect(findAll(open(markdown).json, "rawBlock").map((node) => node.attrs?.source)).toEqual([
      '<div style="overflow-x: auto">',
      "</div>",
    ]);
    expect(cellTexts(markdown)).toEqual(["a", "b", "1", "2"]);
  });
});
