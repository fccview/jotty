import { describe, expect, it } from "vitest";
import { svgNaturalSize, toSvgSrc } from "@/app/_utils/svg-frame-utils";
import { buildScene, readScene, SceneStatus, serializeScene } from "@/app/_utils/excalidraw-scene-utils";
import { drawioEmbedUrl, isBlankDrawioSvg, isTrustedDrawioOrigin, readDrawioMessage, readDrawioSvg } from "@/app/_utils/drawio-utils";
import { diagramProps } from "@/app/_utils/diagram-props-utils";
import { pickLangCode } from "@/app/_components/FeatureComponents/Notes/Parts/Diagrams/excalidraw-loader";
import { utf8ToBase64 } from "@/app/_utils/base64-utils";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

const element = (fields: Record<string, unknown>) => fields as unknown as ExcalidrawElement;

describe("svgNaturalSize", () => {
  it("uses explicit pixel sizes", () => {
    expect(svgNaturalSize('<svg width="241px" height="121px" viewBox="-0.5 -0.5 241 121">')).toEqual({ width: 241, height: 121 });
  });

  it("falls back to the viewBox for excalidraw svgs saved without a size", () => {
    expect(svgNaturalSize('<svg version="1.1" viewBox="0 0 320.5 180" style="max-width: 100%; height: auto;">')).toEqual({ width: 321, height: 180 });
  });

  it("does not read stroke-width as a size", () => {
    expect(svgNaturalSize('<svg stroke-width="2" viewBox="0 0 10 20">')).toEqual({ width: 10, height: 20 });
  });

  it("sizes a high dpi export by its viewBox, not its pixel size", () => {
    expect(svgNaturalSize('<svg viewBox="0 0 360.5 160" width="721" height="320">')).toEqual({ width: 361, height: 160 });
  });

  it("uses pixel sizes when there is no viewBox", () => {
    expect(svgNaturalSize('<svg width="200px" height="100px">')).toEqual({ width: 200, height: 100 });
  });

  it("gives up on svgs it cannot size", () => {
    expect(svgNaturalSize('<svg width="100%">')).toBeNull();
    expect(svgNaturalSize("not an svg")).toBeNull();
  });

  it("adds the svg namespace before building a data uri", () => {
    expect(decodeURIComponent(toSvgSrc("<svg><text>a &amp; b</text></svg>"))).toContain('<svg xmlns="http://www.w3.org/2000/svg"><text>a &amp; b</text>');
  });
});

describe("excalidraw scenes", () => {
  const text = element({ id: "t", type: "text", text: "hi" });
  const image = element({ id: "i", type: "image", fileId: "kept" });
  const gone = element({ id: "g", type: "image", fileId: "dropped", isDeleted: true });
  const files = {
    kept: { id: "kept", dataURL: "data:image/png;base64,AA==", mimeType: "image/png", created: 1 },
    dropped: { id: "dropped", dataURL: "data:image/png;base64,BB==", mimeType: "image/png", created: 1 },
    orphan: { id: "orphan", dataURL: "data:image/png;base64,CC==", mimeType: "image/png", created: 1 },
  } as never;

  it("stores only live elements, their files and style defaults", () => {
    const scene = buildScene([text, image, gone], { viewBackgroundColor: "#fff", zoom: { value: 2 } } as never, files);
    expect(scene.elements).toEqual([text, image]);
    expect(Object.keys(scene.files)).toEqual(["kept"]);
    expect(scene.appState).toEqual({ viewBackgroundColor: "#fff" });
  });

  it("serializes an empty drawing as nothing", () => {
    expect(serializeScene(buildScene([], {}, null))).toBeNull();
    expect(serializeScene(buildScene([gone], {}, files))).toBeNull();
  });

  it("reads scenes written by the old editor", () => {
    const old = JSON.stringify({ elements: [text], appState: { zoom: { value: 0.5 }, scrollX: 10, gridSize: 20 }, files: null });
    const read = readScene(old);
    expect(read.status).toBe(SceneStatus.Ready);
    if (read.status !== SceneStatus.Ready) return;
    expect(read.scene.elements).toEqual([text]);
    expect(read.scene.appState).toEqual({ gridSize: 20 });
    expect(read.scene.files).toEqual({});
  });

  it("treats a missing scene as a blank canvas", () => {
    expect(readScene(null).status).toBe(SceneStatus.Ready);
    expect(readScene("null").status).toBe(SceneStatus.Ready);
  });

  it("refuses to open a scene it cannot read rather than overwrite it", () => {
    expect(readScene("{not json").status).toBe(SceneStatus.Unreadable);
    expect(readScene('{"elements":"nope"}').status).toBe(SceneStatus.Unreadable);
  });
});

describe("draw.io bridge", () => {
  it("builds the embed url for a direct and a proxied instance", () => {
    expect(drawioEmbedUrl("https://embed.diagrams.net", { dark: true, locale: "it" })).toBe(
      "https://embed.diagrams.net/?embed=1&ui=kennedy&spin=1&proto=json&saveAndExit=1&noSaveBtn=0&dark=1&lang=it",
    );
    expect(drawioEmbedUrl("/api/diagram-proxy", { dark: false, locale: "en" })).toMatch(/\/api\/diagram-proxy\/\?embed=1/);
  });

  it("trusts the configured origin and real diagrams.net hosts only", () => {
    expect(isTrustedDrawioOrigin("https://draw.example.com", "https://draw.example.com")).toBe(true);
    expect(isTrustedDrawioOrigin("https://app.diagrams.net", "https://embed.diagrams.net")).toBe(true);
    expect(isTrustedDrawioOrigin("https://diagrams.net.evil.com", "https://embed.diagrams.net")).toBe(false);
    expect(isTrustedDrawioOrigin("http://embed.diagrams.net", "https://embed.diagrams.net")).toBe(false);
    expect(isTrustedDrawioOrigin("https://app.diagrams.net", "https://draw.example.com")).toBe(false);
  });

  it("reads json messages and ignores everything else", () => {
    expect(readDrawioMessage('{"event":"init"}')).toEqual({ event: "init" });
    expect(readDrawioMessage('{"nope":1}')).toBeNull();
    expect(readDrawioMessage({ event: "init" })).toBeNull();
    expect(readDrawioMessage("ready")).toBeNull();
  });

  it("spots the 1px svg draw.io exports for an empty page", () => {
    expect(isBlankDrawioSvg('<svg width="1px" height="1px" viewBox="0 0 1 1"></svg>')).toBe(true);
    expect(isBlankDrawioSvg('<svg width="121px" height="61px" viewBox="-0.5 -0.5 121 61"></svg>')).toBe(false);
  });

  it("decodes exported svgs in every shape draw.io sends", () => {
    const svg = '<svg><text>ü &amp; x</text></svg>';
    expect(readDrawioSvg(`data:image/svg+xml;base64,${utf8ToBase64(svg)}`)).toBe(svg);
    expect(readDrawioSvg(`data:image/svg+xml,${encodeURIComponent(svg)}`)).toBe(svg);
    expect(readDrawioSvg(svg)).toBe(svg);
    expect(readDrawioSvg("garbage")).toBeNull();
  });
});

describe("diagram props in the markdown view", () => {
  it("reads kebab and camel props and decodes a base64 preview", () => {
    expect(diagramProps({ "data-drawio": "", "data-drawio-svg": utf8ToBase64("<svg/>"), "data-drawio-theme": "dark" })).toEqual({
      kind: "drawio",
      svg: "<svg/>",
      data: "",
      theme: "dark",
    });
    expect(diagramProps({ dataExcalidraw: "", dataExcalidrawSvg: "<svg/>", dataExcalidrawData: "{}" })?.kind).toBe("excalidraw");
    expect(diagramProps({ className: "x" })).toBeNull();
  });
});

describe("pickLangCode", () => {
  const codes = ["en", "de-DE", "pt-BR", "pt-PT", "zh-CN"];
  it.each([
    ["de", "de-DE"],
    ["pt-PT", "pt-PT"],
    ["zh", "zh-CN"],
    ["klingon", "en"],
    ["pirate", "en"],
  ])("maps %s to %s", (locale, expected) => {
    expect(pickLangCode(locale, codes)).toBe(expected);
  });
});
