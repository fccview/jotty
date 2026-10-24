// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { freshSave, open } from "./harness";
import { blockTypes, expectRoundtrip, findAll, findOne, textOf } from "./properties";

const UUID = "123e4567-e89b-42d3-a456-426614174000";

const BEAUTIFIED_TABLE = [
  '<table style="min-width: 50px">',
  "  <colgroup>",
  "    <col>",
  "    <col>",
  "  </colgroup>",
  "  <tbody>",
  "    <tr>",
  '      <th colspan="1" rowspan="1">',
  "        <p>Head</p>",
  "      </th>",
  '      <th colspan="1" rowspan="1">',
  "        <p>Two</p>",
  "      </th>",
  "    </tr>",
  "    <tr>",
  '      <td colspan="1" rowspan="1">',
  "        <p>a</p>",
  "      </td>",
  '      <td colspan="1" rowspan="1">',
  "        <p>b</p>",
  "      </td>",
  "    </tr>",
  "  </tbody>",
  "</table>",
].join("\n");

const DRAWIO = "<!-- drawio-diagram\ndata: PG14Pg==\nsvg: PHN2Zz48L3N2Zz4=\ntheme: dark\n-->";
const EXCALIDRAW = "<!-- excalidraw-diagram\ndata: eyJhIjoxfQ==\nsvg: PHN2Zz48L3N2Zz4=\ntheme: light\n-->";

describe("shapes written by the turndown editor", () => {
  it("reads zero width space paragraphs as empty paragraphs", () => {
    const markdown = "one\n\n​\n\ntwo";
    expectRoundtrip(markdown);
    const json = open(markdown).json;
    expect(blockTypes(json)).toEqual(["paragraph", "paragraph", "paragraph"]);
    expect(json.content?.[1].content).toBeUndefined();
    expect(freshSave(markdown)).toBe("one\n\n&nbsp;\n\ntwo");
  });

  it("reads three space bullet markers as a nested bullet list", () => {
    const markdown = "-   item\n-   two\n    -   nested";
    expectRoundtrip(markdown);
    const json = open(markdown).json;
    expect(findAll(json, "bulletList")).toHaveLength(2);
    expect(findAll(json, "listItem").map(textOf)).toEqual(["item", "twonested", "nested"]);
    expect(freshSave(markdown)).toBe("- item\n- two\n  - nested");
  });

  it("reads two space ordered markers as an ordered list", () => {
    const markdown = "1.  item\n2.  two";
    expectRoundtrip(markdown);
    expect(findAll(open(markdown).json, "listItem").map(textOf)).toEqual(["item", "two"]);
    expect(freshSave(markdown)).toBe("1. item\n2. two");
  });

  it("reads a beautified html table with colgroup, default spans and cell paragraphs", () => {
    expectRoundtrip(BEAUTIFIED_TABLE);
    const json = open(BEAUTIFIED_TABLE).json;
    expect(findAll(json, "tableHeader").map(textOf)).toEqual(["Head", "Two"]);
    expect(findAll(json, "tableCell").map(textOf)).toEqual(["a", "b"]);
  });

  it("keeps the beautified html table as html when asked for html tables", () => {
    const fresh = freshSave(BEAUTIFIED_TABLE, "html");
    expect(fresh).toMatch(/^<table>/);
    expect(fresh).not.toContain("colgroup");
    expect(fresh).not.toContain('colspan="1"');
    expect(fresh).not.toContain("<p>");
  });

  it("reads a sized img tag as a sized image", () => {
    const markdown = '<img src="/api/image/u/p.png" alt="p" style="width: 200px; height: 100px" />';
    expectRoundtrip(markdown);
    const image = findOne(open(markdown).json, "image");
    expect(image.attrs).toMatchObject({ src: "/api/image/u/p.png", alt: "p", width: 200, height: 100 });
    expect(freshSave(markdown)).toBe(markdown);
  });

  it("reads a styled mark with its background and text colour", () => {
    const markdown = '<mark style="background-color: #ff0000; color: #ffffff">hot</mark> text';
    expectRoundtrip(markdown);
    expect(freshSave(markdown)).toBe(markdown);
  });

  it("reads a colour span as a text colour", () => {
    const markdown = '<span style="color: #00ff00">green</span> text';
    expectRoundtrip(markdown);
    const [text] = findAll(open(markdown).json, "text");
    expect(text.marks).toEqual([{ type: "textStyle", attrs: { color: "#00ff00" } }]);
    expect(freshSave(markdown)).toBe(markdown);
  });

  it("reads a font family span as a font", () => {
    const markdown = "<span style=\"font-family: 'Courier New'\">mono</span> text";
    expectRoundtrip(markdown);
    expect(findAll(open(markdown).json, "text")[0].marks?.map((mark) => mark.type)).toContain("fontFamily");
    expect(freshSave(markdown)).toBe(markdown);
  });

  it.each([
    ["drawio", DRAWIO, { diagramData: "<mx>", svgData: "<svg></svg>", themeMode: "dark" }],
    ["excalidraw", EXCALIDRAW, { diagramData: '{"a":1}', svgData: "<svg></svg>", themeMode: "light" }],
  ])("reads a %s comment as a diagram", (type, markdown, attrs) => {
    expectRoundtrip(markdown);
    expect(findOne(open(markdown).json, type).attrs).toEqual(attrs);
    expect(freshSave(markdown)).toBe(markdown);
  });

  it.each([
    ["INFO", "info"],
    ["NOTE", "info"],
    ["TIP", "success"],
    ["IMPORTANT", "warning"],
    ["WARNING", "warning"],
    ["CAUTION", "danger"],
  ])("reads a [!%s] quote as a %s callout", (marker, type) => {
    const markdown = `> [!${marker}]\n> body text`;
    expectRoundtrip(markdown);
    const callout = findOne(open(markdown).json, "callout");
    expect(callout.attrs).toEqual({ type });
    expect(textOf(callout)).toBe("body text");
  });

  it("reads details and summary as a details block", () => {
    const markdown = "<details>\n<summary>Click</summary>\n\nHidden **text**\n\n</details>";
    expectRoundtrip(markdown);
    const details = findOne(open(markdown).json, "details");
    expect(details.attrs).toEqual({ summary: "Click" });
    expect(textOf(details)).toBe("Hidden text");
  });

  it("reads a uuid jotty link as an internal link", () => {
    const markdown = `[My note](/jotty/${UUID})`;
    expectRoundtrip(markdown);
    expect(findOne(open(markdown).json, "internalLink").attrs).toMatchObject({ title: "My note", uuid: UUID });
  });

  it("reads a legacy category link as an internal link", () => {
    const markdown = "[Old](/note/Work/my-note)";
    expectRoundtrip(markdown);
    expect(findOne(open(markdown).json, "internalLink").attrs).toMatchObject({
      title: "Old",
      category: "Work",
      itemId: "my-note",
    });
  });

  it.each([
    ["file", "[📎 report.pdf](/api/file/u/report.pdf)"],
    ["video", "[🎥 clip.mp4](/api/video/u/clip.mp4)"],
  ])("keeps a %s attachment link", (_kind, markdown) => {
    expectRoundtrip(markdown);
    expect(freshSave(markdown)).toBe(markdown);
  });

  it("reads hashtags as tags", () => {
    const markdown = "#tag at start and #nested/child";
    expectRoundtrip(markdown);
    expect(findAll(open(markdown).json, "tagLink").map((node) => node.attrs?.tag)).toEqual(["tag", "nested/child"]);
  });

  it("keeps wikilinks unescaped", () => {
    const markdown = "see [[Some Note]] and [[Other]]";
    expectRoundtrip(markdown);
    expect(freshSave(markdown)).toBe(markdown);
  });

  it("reads a mermaid fence as a mermaid diagram", () => {
    const markdown = "```mermaid\ngraph TD\n  A-->B\n```";
    expectRoundtrip(markdown);
    expect(findOne(open(markdown).json, "mermaid").attrs?.content).toBe("graph TD\n  A-->B");
    expect(freshSave(markdown)).toBe(markdown);
  });
});
