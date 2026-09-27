import { describe, it, expect, vi } from "vitest";

vi.unmock("unified");
vi.unmock("unist-util-visit");
vi.unmock("js-beautify");
vi.unmock("@/app/_utils/markdown-utils");

import {
  base64ToSvg,
  base64ToText,
  repairMojibake,
  utf8ToBase64,
} from "@/app/_utils/base64-utils";
import {
  convertHtmlToMarkdown,
  convertMarkdownToHtml,
} from "@/app/_utils/markdown-utils";

const accented = "Café à la crème, naïve façade";
const wide = "图表 🦄 Ωmega";
const latin1Base64 = (text: string) => btoa(text);
const mojibakeOf = (text: string) =>
  String.fromCharCode(...Array.from(new TextEncoder().encode(text)));

describe("base64 utils", () => {
  it.each([accented, wide, "plain ascii", ""])(
    "should round trip %s through utf8 base64",
    (text) => {
      expect(base64ToText(utf8ToBase64(text))).toBe(text);
    },
  );

  it("should match node's utf8 base64 so saved notes stay readable", () => {
    expect(utf8ToBase64(accented)).toBe(
      Buffer.from(accented, "utf8").toString("base64"),
    );
  });

  it("should still read diagrams saved with plain btoa", () => {
    expect(base64ToText(latin1Base64(accented))).toBe(accented);
  });

  it("should repair a preview saved double encoded", () => {
    const saved = utf8ToBase64(mojibakeOf(accented));
    expect(base64ToSvg(saved)).toBe(accented);
  });

  it("should leave real latin1 and wide text alone", () => {
    expect(repairMojibake(accented)).toBe(accented);
    expect(repairMojibake(wide)).toBe(wide);
    expect(repairMojibake("<svg>ok</svg>")).toBe("<svg>ok</svg>");
  });

  it("should throw on garbage so callers can keep the raw comment", () => {
    expect(() => base64ToText("not base64 !!")).toThrow();
  });
});

describe("drawio diagram round trip", () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><text>${accented} ${wide}</text></svg>`;
  const xml = `<mxfile><diagram name="${accented}"/></mxfile>`;

  it("should survive editor html -> markdown -> editor html", () => {
    const markdown = convertHtmlToMarkdown(
      `<div data-drawio="" data-drawio-data="${xml.replace(/"/g, "&quot;")}" data-drawio-svg="${svg.replace(/"/g, "&quot;")}" data-drawio-theme="light">[Draw.io Diagram]</div>`,
    );
    const data = markdown.match(/data: (\S+)/)?.[1] ?? "";
    const preview = markdown.match(/svg: (\S+)/)?.[1] ?? "";
    expect(base64ToText(data)).toBe(xml);
    expect(base64ToSvg(preview)).toBe(svg);

    const html = convertMarkdownToHtml(markdown);
    expect(html).toContain(accented);
    expect(html).toContain(wide);
  });
});
