import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { SvgFrame } from "@/app/_components/FeatureComponents/Notes/Parts/SvgFrame";
import { BOUNCED_ELEMENTS, SVG_FRAME_ATTR } from "@/app/_consts/notes";
import { noteUrlTransform } from "@/app/_utils/url-transform-utils";

const EVIL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><foreignObject><img src="x" onerror="alert(2)"/></foreignObject></svg>';

const renderNote = (markdown: string): string =>
  renderToStaticMarkup(
    createElement(
      ReactMarkdown,
      {
        rehypePlugins: [rehypeRaw],
        urlTransform: noteUrlTransform,
        disallowedElements: BOUNCED_ELEMENTS,
      },
      markdown,
    ),
  );

describe("Security: script in note content", () => {
  it("renders diagram svg as an image, never as live markup", () => {
    const html = renderToStaticMarkup(
      createElement(SvgFrame, { svg: EVIL_SVG, alt: "diagram" }),
    );

    expect(html.startsWith("<img")).toBe(true);
    expect(html).not.toContain("<svg");
    expect(html).not.toContain("onerror=");
  });

  it("keeps diagrams working when the stored svg is not a clean document", () => {
    const frame = (svg: string) =>
      renderToStaticMarkup(createElement(SvgFrame, { svg, alt: "diagram" }));
    const dataUri = "data:image/svg+xml;base64,PHN2Zy8+";

    expect(frame(dataUri)).toContain(`src="${dataUri}"`);
    expect(frame('<svg viewBox="0 0 1 1"></svg>')).toContain(
      encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"'),
    );
    expect(frame("<svg/>")).toContain(SVG_FRAME_ATTR);
  });

  it("drops an unclosed iframe carrying a srcdoc script", () => {
    const html = renderNote('hi\n\n<iframe srcdoc="<script>parent.alert(1)</script>">');

    expect(html).not.toContain("iframe");
    expect(html).toContain("hi");
  });

  it("drops object, embed and base tags", () => {
    const html = renderNote(
      '<object data="x"></object><embed src="x"><base href="https://evil.test/">',
    );

    expect(html).not.toMatch(/<(object|embed|base)/);
  });

  it("still dials tel links and blocks javascript links", () => {
    expect(renderNote("[call](tel:123)")).toContain('href="tel:123"');
    expect(renderNote("[x](javascript:alert(1))")).not.toContain("javascript:");
  });
});
