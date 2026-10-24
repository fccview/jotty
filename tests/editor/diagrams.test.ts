// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import type { Editor } from "@tiptap/core";
import { editAndSave, freshSave, open } from "./harness";
import { blockTypes, expectRoundtrip, findAll, findOne } from "./properties";
import { readDiagramComment, writeDiagramComment, DiagramKind, DiagramTheme } from "@/app/_utils/markdown/diagram-comment";
import { utf8ToBase64 } from "@/app/_utils/base64-utils";

const SCENE = JSON.stringify({
  type: "excalidraw",
  elements: [{ id: "t", type: "text", text: "a < b & c > d \"q\" 'x' ünï 😀 -->" }, { id: "i", type: "image", fileId: "f1" }],
  appState: { viewBackgroundColor: "#ffffff" },
  files: { f1: { id: "f1", mimeType: "image/png", dataURL: "data:image/png;base64,iVBORw0KGgo=" } },
});
const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50" width="100" height="50"><text>a &lt; b &amp; c</text><style>@font-face{font-family:"X";src:url(data:font/woff2;base64,AAA=)}</style></svg>';
const XML = '<mxfile><diagram name="ü &amp; &lt;x&gt;">&lt;mxGraphModel/&gt;</diagram></mxfile>';

const insert = (type: string, attrs: Record<string, unknown>) => (instance: Editor) => {
  instance.commands.setContent({
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "intro" }] },
      { type, attrs },
      { type: "paragraph", content: [{ type: "text", text: "outro" }] },
    ],
  });
};

const saveWith = (type: string, attrs: Record<string, unknown>) => editAndSave("intro", insert(type, attrs));

describe("diagram nodes survive a save and reload", () => {
  it.each([
    ["excalidraw", { diagramData: SCENE, svgData: SVG, themeMode: "dark" }],
    ["drawio", { diagramData: XML, svgData: SVG, themeMode: "light" }],
  ])("keeps a %s scene byte for byte", (type, attrs) => {
    const markdown = saveWith(type, attrs);
    expect(findOne(open(markdown).json, type).attrs).toEqual(attrs);
    expectRoundtrip(markdown);
  });

  it.each(["excalidraw", "drawio"])("reloads a %s that was inserted but never drawn", (type) => {
    const markdown = saveWith(type, { diagramData: null, svgData: null, themeMode: "light" });
    const json = open(markdown).json;
    expect(blockTypes(json)).toEqual(["paragraph", type, "paragraph"]);
    expect(findOne(json, type).attrs).toEqual({ diagramData: null, svgData: null, themeMode: "light" });
    expectRoundtrip(markdown);
  });

  it.each([
    "graph TD\n  A[\"a < b & c\"] -->|`x`| B\n  B --> C<br/>D",
    "sequenceDiagram\n  A->>B: hi & bye <3\n```\nnot a fence end",
    "graph LR\n  A --> B\n",
    "\n\ngraph LR\n  A --> B",
  ])("keeps mermaid source %#", (content) => {
    const markdown = saveWith("mermaid", { content });
    expect(findOne(open(markdown).json, "mermaid").attrs).toEqual({ content });
    expect(freshSave(markdown)).toBe(markdown);
  });

  it("keeps several diagrams in one note apart", () => {
    const markdown = [
      writeDiagramComment(DiagramKind.Excalidraw, { diagramData: SCENE, svgData: SVG, themeMode: DiagramTheme.Light }),
      "```mermaid\ngraph TD\n  A --> B\n```",
      writeDiagramComment(DiagramKind.Drawio, { diagramData: XML, svgData: SVG, themeMode: DiagramTheme.Dark }),
    ].join("\n\n");
    expect(blockTypes(open(markdown).json).filter((type) => type !== "paragraph")).toEqual([
      "excalidraw",
      "mermaid",
      "drawio",
    ]);
    expectRoundtrip(markdown);
  });
});

describe("old diagram comment shapes", () => {
  it("reads an excalidraw comment without an svg line", () => {
    const markdown = `<!-- excalidraw-diagram\ndata: ${utf8ToBase64(SCENE)}\ntheme: dark\n-->`;
    expect(findOne(open(markdown).json, "excalidraw").attrs).toEqual({ diagramData: SCENE, svgData: null, themeMode: "dark" });
  });

  it("reads a drawio comment with an empty svg instead of dropping it", () => {
    const markdown = `<!-- drawio-diagram\ndata: ${utf8ToBase64(XML)}\nsvg: \ntheme: light\n-->`;
    expect(findOne(open(markdown).json, "drawio").attrs).toEqual({ diagramData: XML, svgData: null, themeMode: "light" });
  });

  it("reads plain btoa data and CRLF line endings", () => {
    const markdown = `<!-- drawio-diagram\r\ndata: ${btoa("<mx>")}\r\nsvg: ${btoa("<svg></svg>")}\r\ntheme: dark\r\n-->`;
    expect(findOne(open(markdown).json, "drawio").attrs).toEqual({ diagramData: "<mx>", svgData: "<svg></svg>", themeMode: "dark" });
  });

  it("keeps a corrupt diagram comment as raw text instead of dropping it", () => {
    const markdown = "before\n\n<!-- excalidraw-diagram\ndata: %%%not base64%%%\nsvg: \ntheme: light\n-->\n\nafter";
    const json = open(markdown).json;
    expect(findAll(json, "excalidraw")).toHaveLength(0);
    expect(findAll(json, "rawBlock")).toHaveLength(1);
    expect(freshSave(markdown)).toBe(markdown);
  });

  it("ignores ordinary comments that only mention a diagram", () => {
    expect(readDiagramComment(" TODO: add a drawio-diagram here ")).toBeNull();
    expect(readDiagramComment(" drawio-diagramish\ndata: eA==\n")).toBeNull();
  });
});
