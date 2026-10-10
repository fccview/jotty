import { describe, it, expect, vi } from "vitest";

vi.unmock("unified");
vi.unmock("unist-util-visit");
vi.unmock("js-beautify");
vi.unmock("@/app/_utils/markdown-utils");

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { noteUrlTransform } from "@/app/_utils/url-transform-utils";
import { markdownToEditorHtml } from "@/app/_utils/markdown/parse/to-html";
import { serializeDoc } from "@/app/_utils/markdown/serialize";

describe("noteUrlTransform", () => {
  it.each([
    "tel:+18005551212",
    "TEL:+18005551212",
    "sms:+18005551212?body=hi",
    "mailto:someone@example.com",
    "https://example.com",
    "http://example.com/path?q=1#x",
    "/note/abc",
    "#heading",
    "relative/path",
  ])("should keep %s", (url) => {
    expect(noteUrlTransform(url)).toBe(url);
  });

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "java\nscript:alert(1)",
    " javascript:alert(1)",
    "\u0001javascript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "tel\n:javascript:alert(1)",
    "xtel:+1800",
  ])("should block %s", (url) => {
    expect(noteUrlTransform(url)).toBe("");
  });
});

describe("tel links through the editor round trip", () => {
  it("should keep tel: when markdown becomes editor html", () => {
    expect(markdownToEditorHtml("[Call](tel:+18005551212)")).toContain(
      'href="tel:+18005551212"',
    );
  });

  it("should keep tel: when editor html is saved back to markdown", () => {
    expect(
      serializeDoc({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", marks: [{ type: "link", attrs: { href: "tel:+18005551212" } }], text: "Call" }],
          },
        ],
      }),
    ).toBe("[Call](tel:+18005551212)");
  });
});

describe("tel links in the note view", () => {
  const render = (markdown: string) =>
    renderToStaticMarkup(
      createElement(
        ReactMarkdown,
        { rehypePlugins: [rehypeRaw], urlTransform: noteUrlTransform },
        markdown,
      ),
    );

  it("should render markdown and raw html tel links", () => {
    const html = render(
      '[Call](tel:+18005551212) <a href="sms:+18005551212">Text</a>',
    );
    expect(html).toContain('href="tel:+18005551212"');
    expect(html).toContain('href="sms:+18005551212"');
  });

  it("should still empty dangerous hrefs from markdown and raw html", () => {
    const html = render(
      '[x](javascript:alert(1)) <a href="data:text/html,hi">y</a>',
    );
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("data:");
  });
});
