// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { freshSave, open } from "./harness";
import { expectRoundtrip, findAll, markTypes } from "./properties";

const rawSources = (markdown: string, type: string) =>
  findAll(open(markdown).json, type).map((node) => node.attrs?.source);

describe("custom html the viewer renders", () => {
  it.each([
    ["div with markdown", '<div align="center">\n\n**centered**\n\n</div>'],
    ["plain div", "<div>raw div</div>"],
    ["aligned paragraph", '<p align="center">centered</p>\n\nmarkdown after'],
    ["center", "<center>old</center>"],
    ["section", "<section>\n<h2>Title</h2>\n<p>para</p>\n</section>"],
    ["definition list", "<dl>\n<dt>Term</dt>\n<dd>Def</dd>\n</dl>"],
    ["video", '<video src="/api/video/u/a.mp4" controls></video>'],
    ["audio", '<audio controls src="/a.mp3"></audio>'],
    ["svg", '<svg width="10" height="10"><circle r="5"/></svg>'],
    ["comment", "<!-- just a comment -->"],
    ["comment then text", "<!-- a plain comment -->\n\ntext"],
    ["pre", "<pre>preformatted\n  text</pre>\n\nmarkdown after"],
    ["open details", "<details open>\n<summary>Open</summary>\n\ncontent\n\n</details>"],
    ["nested details", "<details>\n<summary>Outer</summary>\n\n<details>\n<summary>Inner</summary>\n\nnested\n\n</details>\n\n</details>"],
    ["html heading", "<h1>html heading</h1>\n\ntext after"],
    ["html list", "<ul>\n<li>html list</li>\n</ul>\n\ntext after"],
    ["hr tag", "<hr>"],
    ["bounced iframe", '<iframe src="https://x.com"></iframe>'],
    ["bounced style", "<style>p{color:red}</style>"],
  ])("%s block keeps its bytes and never drifts", (_name, markdown) => {
    expectRoundtrip(markdown);
  });

  it.each([
    ["small", "some <small>tiny</small> text"],
    ["semantic tags", "a <ins>new</ins> and <q>quote</q> and <cite>c</cite> and <var>x</var>"],
    ["classed span", '<span class="foo">classy</span> text'],
    ["plain span", "<span>plain span</span> text"],
    ["background span", '<span style="background-color: #ff0">bg span</span>'],
    ["colour and background span", '<span style="color: red; background-color: yellow">both</span> x'],
    ["classed kbd", '<kbd class="k">K</kbd> text'],
    ["anchor", '<a name="anchor"></a>text'],
    ["inline comment", "text <!-- inline comment --> more"],
  ])("unknown inline %s stays raw html", (_name, markdown) => {
    expectRoundtrip(markdown);
    expect(freshSave(markdown)).toBe(markdown);
  });

  it.each([
    ["sub sup kbd", "H<sub>2</sub>O x<sup>2</sup> <kbd>Ctrl</kbd>", ["subscript", "superscript", "kbd"]],
    ["abbr", '<abbr title="HyperText">HTML</abbr> rocks', ["abbreviation"]],
    ["underline", "<u>under</u> text", ["underline"]],
    ["mark", "<mark>hi</mark> there", ["highlight"]],
    ["colour span with bold", 'x <span style="color: red">a <b>b</b></span> y', ["textStyle", "textStyle", "bold"]],
    ["colour and font span", '<span style="color: red; font-family: Arial">both</span> x', ["textStyle", "fontFamily"]],
  ])("known inline %s becomes editable marks", (_name, markdown, marks) => {
    expectRoundtrip(markdown);
    expect(markTypes(open(markdown).json)).toEqual(marks);
    expect(findAll(open(markdown).json, "rawInline")).toEqual([]);
  });

  it("keeps an unknown block as one raw block with its exact source", () => {
    expect(rawSources("<div>raw div</div>", "rawBlock")).toEqual(["<div>raw div</div>"]);
  });

  it("keeps both tags of an unknown inline element raw so it closes", () => {
    expect(rawSources('<kbd class="k">K</kbd> text', "rawInline")).toEqual(['<kbd class="k">', "</kbd>"]);
  });

  it("keeps html bold tags editable while a stray closer stays raw", () => {
    const markdown = "a <b>b</b> c </b> d";
    expectRoundtrip(markdown);
    expect(rawSources(markdown, "rawInline")).toEqual(["</b>"]);
    expect(freshSave(markdown)).toBe("a **b** c </b> d");
  });

  it("closes a colour span on the same line on a fresh save", () => {
    const fresh = freshSave('<span style="color: #ff0000">red</span> and <span style="color: #00ff00">green</span>');
    expect(fresh).toBe('<span style="color: #ff0000">red</span> and <span style="color: #00ff00">green</span>');
  });

  it("writes html bold tags as markdown on a fresh save", () => {
    expect(freshSave("<b>bold</b> <i>it</i> <strong>s</strong> <em>e</em> <s>s</s> <del>d</del> <strike>st</strike>")).toBe(
      "**bold** *it* **s** *e* ~~s~~ ~~d~~ ~~st~~",
    );
  });

  it("keeps a sized image without alt or style exactly as written", () => {
    const markdown = '<img src="/x.png" width="100" />';
    expectRoundtrip(markdown);
    expect(freshSave(markdown)).toBe(markdown);
  });

  it("keeps a resized image style verbatim", () => {
    const markdown = '<img src="/x.png" alt="a" title="t" style="width: 200px;height: 100px;" />';
    expectRoundtrip(markdown);
    expect(freshSave(markdown)).toBe(markdown);
  });

  it("keeps an image style that carries no size", () => {
    const markdown = '<img src="/x.png" style="border: 1px solid red" width="50" />';
    expectRoundtrip(markdown);
    expect(freshSave(markdown)).toBe(markdown);
  });
});

describe("accepted html normalisations", () => {
  it("splits a paragraph around an inline image because images are blocks in the editor", () => {
    const markdown = 'text <img src="/x.png" alt="i"> inline';
    expect(freshSave(markdown)).toBe("text\n\n![i](/x.png)\n\ninline");
    expect(freshSave(freshSave(markdown))).toBe("text\n\n![i](/x.png)\n\ninline");
  });

  it("writes a link with only href and target as markdown", () => {
    const markdown = '<a href="https://x.com" target="_blank">html link</a>';
    expectRoundtrip(markdown);
    expect(freshSave(markdown)).toBe("[html link](https://x.com)");
  });
});
