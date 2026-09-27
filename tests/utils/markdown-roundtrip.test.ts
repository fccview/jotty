import { describe, it, expect, vi } from "vitest";

vi.unmock("unified");
vi.unmock("unist-util-visit");
vi.unmock("js-beautify");
vi.unmock("@/app/_utils/markdown-utils");

import {
  convertHtmlToMarkdown,
  convertMarkdownToHtml,
  sanitizeMarkdown,
} from "@/app/_utils/markdown-utils";

const ZWSP = "​";

const BASH_SNIPPET = [
  "git diff --name-only -z HEAD --cached \\",
  "| sort -zu \\",
  "| grep -zE '\\.(ts|tsx|js|jsx|json|py|importliner)$|vite\\.config\\.mts$|\\.env\\.template$' \\",
  "| grep -zvE '^(\\.|node_modules/|dist/)' \\",
  "| while IFS= read -r -d '' f; do",
  '    echo "--- FILE_START: $f ---"',
  '    cat "$f"',
  '    echo "--- FILE_END: $f ---"',
  "    echo",
  "done > script.txt",
].join("\n");

const decodeEntities = (html: string) =>
  html
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;|&#x3C;/g, "<")
    .replace(/&amp;|&#x26;/g, "&");

describe("markdown round trip", () => {
  const markdown = `Before\n\n\`\`\`bash\n${BASH_SNIPPET}\n\`\`\`\n\nAfter #tagged\n`;

  it("keeps a bash code block with $' intact when rendering to html", () => {
    const html = convertMarkdownToHtml(markdown);
    const code = html.match(/<code[^>]*>([\s\S]*?)<\/code>/)?.[1] ?? "";

    expect(decodeEntities(code)).toBe(`${BASH_SNIPPET}\n`);
    expect(html).not.toContain("__CODE_BLOCK_");
  });

  it("keeps every replacement pattern literal inside code", () => {
    const tricky = "echo $& $` $' $$ $1 $<name>";
    const html = convertMarkdownToHtml(
      `\`\`\`\n${tricky}\n\`\`\`\n\n#after and \`$'\` then #more`
    );

    expect(decodeEntities(html)).toContain(`<code>${tricky}\n</code>`);
    expect(decodeEntities(html)).toContain("<code>$'</code> then");
  });

  it("survives html -> markdown -> html unchanged", () => {
    const html = convertMarkdownToHtml(markdown);
    const saved = convertHtmlToMarkdown(html);

    expect(saved).toContain(BASH_SNIPPET);
    expect(saved).not.toContain(ZWSP);
    expect(convertHtmlToMarkdown(convertMarkdownToHtml(saved))).toBe(saved);
  });
});

describe("saved note bytes", () => {
  const editorHtml =
    "<p>just testing this out</p><ul><li><p>goo</p></li><li><p>bar</p></li></ul><p></p>";

  it("does not end a note with a zero-width space from the trailing empty paragraph", () => {
    const markdown = convertHtmlToMarkdown(editorHtml);

    expect(markdown).not.toContain(ZWSP);
    expect(markdown.endsWith("bar")).toBe(true);
  });

  it("still keeps an empty paragraph in the middle of a note", () => {
    const markdown = convertHtmlToMarkdown("<p>one</p><p></p><p>two</p>");

    expect(markdown).toBe(`one\n\n${ZWSP}\n\ntwo`);
  });

  it("strips the CRLF a multipart form post adds and the stray zero-width tail", async () => {
    const markdown = `just testing this out\n\n-   goo\n-   bar\n\n${ZWSP}`;
    const form = new FormData();
    form.append("content", markdown);
    const received = (await new Response(form).formData()).get("content");

    expect(received).toContain("\r\n");

    const saved = sanitizeMarkdown(String(received));

    expect(saved).not.toContain("\r");
    expect(saved).not.toContain(ZWSP);
    expect(saved).toBe("just testing this out\n\n-   goo\n-   bar");
  });

  it("leaves a note without a zero-width tail alone", () => {
    expect(sanitizeMarkdown("line one\nline two\n")).toBe(
      "line one\nline two\n"
    );
  });
});
