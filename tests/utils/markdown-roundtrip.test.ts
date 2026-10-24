import { describe, it, expect, vi } from "vitest";

vi.unmock("unified");
vi.unmock("unist-util-visit");
vi.unmock("js-beautify");
vi.unmock("@/app/_utils/markdown-utils");

import { sanitizeMarkdown, tagOutsideCode } from "@/app/_utils/markdown-utils";
import { markdownToEditorHtml } from "@/app/_utils/markdown/parse/to-html";
import { serializeDoc } from "@/app/_utils/markdown/serialize";
import type { NodeJson } from "@/app/_utils/markdown/serialize/types";

const paragraph = (text?: string): NodeJson =>
  text ? { type: "paragraph", content: [{ type: "text", text }] } : { type: "paragraph" };

const doc = (...content: NodeJson[]): NodeJson => ({ type: "doc", content });

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

  it("tags hashtags without touching the bash block for the view renderer", () => {
    const tagged = tagOutsideCode(markdown);

    expect(tagged).toBe(
      `Before\n\n\`\`\`bash\n${BASH_SNIPPET}\n\`\`\`\n\nAfter <span data-tag="tagged">tagged</span>\n`,
    );
  });

  it("leaves colours inside html attributes alone for the view renderer", () => {
    const markdown = '<span style="color: #ff0000">red</span> #tag';

    expect(tagOutsideCode(markdown)).toBe(
      '<span style="color: #ff0000">red</span> <span data-tag="tag">tag</span>',
    );
  });

  it("keeps a bash code block with $' intact when rendering to html", () => {
    const html = markdownToEditorHtml(markdown);
    const code = html.match(/<code[^>]*>([\s\S]*?)<\/code>/)?.[1] ?? "";

    expect(decodeEntities(code)).toBe(BASH_SNIPPET);
    expect(html).not.toContain("__CODE_BLOCK_");
  });

  it("keeps every replacement pattern literal inside code", () => {
    const tricky = "echo $& $` $' $$ $1 $<name>";
    const html = markdownToEditorHtml(
      `\`\`\`\n${tricky}\n\`\`\`\n\n#after and \`$'\` then #more`
    );

    expect(decodeEntities(html)).toContain(`<code>${tricky}</code>`);
    expect(decodeEntities(html)).toContain("<code>$'</code> then");
  });

  it("writes a bash code block back byte for byte", () => {
    const saved = serializeDoc(
      doc(
        paragraph("Before"),
        { type: "codeBlock", attrs: { language: "bash" }, content: [{ type: "text", text: BASH_SNIPPET }] },
        paragraph("After"),
      ),
    );

    expect(saved).toBe(`Before\n\n\`\`\`bash\n${BASH_SNIPPET}\n\`\`\`\n\nAfter`);
    expect(saved).not.toContain(ZWSP);
  });
});

describe("saved note bytes", () => {
  it("does not end a note with the trailing empty paragraph", () => {
    const markdown = serializeDoc(doc(paragraph("just testing this out"), paragraph()));

    expect(markdown).not.toContain(ZWSP);
    expect(markdown).toBe("just testing this out");
  });

  it("keeps an empty paragraph in the middle of a note as a visible nbsp", () => {
    const markdown = serializeDoc(doc(paragraph("one"), paragraph(), paragraph("two")));

    expect(markdown).toBe("one\n\n&nbsp;\n\ntwo");
  });

  it("reads the legacy zero-width empty paragraph back as an empty paragraph", () => {
    expect(markdownToEditorHtml(`one\n\n${ZWSP}\n\ntwo`)).toContain("<p></p>");
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
