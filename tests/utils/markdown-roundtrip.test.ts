import { describe, it, expect, vi } from "vitest";

vi.unmock("unified");
vi.unmock("unist-util-visit");
vi.unmock("js-beautify");
vi.unmock("@/app/_utils/markdown-utils");

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import { sanitizeMarkdown } from "@/app/_utils/markdown-utils";
import { markdownToEditorHtml } from "@/app/_utils/markdown/parse/to-html";
import { remarkTags } from "@/app/_utils/markdown/parse/tags";
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

const viewHtml = (markdown: string) =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkTags)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeSlug)
      .use(rehypeStringify)
      .processSync(markdown),
  );

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
    const html = viewHtml(markdown);
    const code = html.match(/<code[^>]*>([\s\S]*?)<\/code>/)?.[1] ?? "";

    expect(decodeEntities(code)).toBe(`${BASH_SNIPPET}\n`);
    expect(html).toContain('<p>After <span data-tag="tagged">tagged</span></p>');
  });

  it("leaves colours inside html attributes alone for the view renderer", () => {
    const html = viewHtml('<span style="color: #ff0000">red</span> #tag');

    expect(html).toContain('<span style="color: #ff0000">red</span> <span data-tag="tag">tag</span>');
  });

  it("renders anchor links as links pointing at the slugged heading for the view renderer", () => {
    const html = viewHtml(
      "* [FOREWORD](#foreword)\n* [Trim white-space, from string!](#trim-white-space-from-string)\n\n[ref]: #foreword\n\n## FOREWORD\n\n## Trim white-space, from string!\n\nsee [again][ref] #todo",
    );

    expect(html).toContain('<a href="#foreword">FOREWORD</a>');
    expect(html).toContain('<a href="#trim-white-space-from-string">');
    expect(html).toContain('<h2 id="foreword">FOREWORD</h2>');
    expect(html).toContain('<h2 id="trim-white-space-from-string">');
    expect(html).toContain('<a href="#foreword">again</a>');
    expect(html.match(/data-tag="([^"]+)"/g)).toEqual(['data-tag="todo"']);
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

describe("plain hashes", () => {
  const bold = (text: string): NodeJson => ({ type: "text", text, marks: [{ type: "bold" }] });
  const tagLink = (tag: string): NodeJson => ({ type: "tagLink", attrs: { tag } });
  const tagsIn = (markdown: string) => viewHtml(markdown).match(/data-tag="[^"]+"/g) ?? [];

  it.each([
    ["plain #escaped", "plain \\#escaped"],
    ["#start of a line", "\\#start of a line"],
    ["an (#aside)", "an (\\#aside)"],
    ["a\tTab #x", "a\tTab \\#x"],
  ])("escapes %s so it stays text", (text, saved) => {
    const markdown = serializeDoc(doc(paragraph(text)));
    expect(markdown).toBe(saved);
    expect(tagsIn(markdown)).toEqual([]);
  });

  it.each([
    "C# and F#",
    "item #1 and #2b",
    "a#b and x#y",
    "see https://example.com/#readme",
    "a lone # here",
  ])("leaves %s alone", (text) => {
    expect(serializeDoc(doc(paragraph(text)))).not.toContain("\\#");
  });

  it("leaves a line start heading marker to the line start escape", () => {
    expect(serializeDoc(doc(paragraph("# not a heading")))).toBe("\\# not a heading");
  });

  it("escapes a plain hash opening bold text", () => {
    const markdown = serializeDoc(doc({ type: "paragraph", content: [{ type: "text", text: "see " }, bold("#inside")] }));
    expect(markdown).toBe("see **\\#inside**");
    expect(tagsIn(markdown)).toEqual([]);
  });

  it("does not escape a hash glued after bold text", () => {
    const markdown = serializeDoc(doc({ type: "paragraph", content: [bold("bold"), { type: "text", text: "#glued" }] }));
    expect(markdown).toBe("**bold**#glued");
    expect(tagsIn(markdown)).toEqual([]);
  });

  it("escapes a hash at the start of a text after a space", () => {
    const markdown = serializeDoc(doc({ type: "paragraph", content: [tagLink("real"), { type: "text", text: " #fake" }] }));
    expect(markdown).toBe("#real \\#fake");
    expect(tagsIn(markdown)).toEqual(['data-tag="real"']);
  });

  it("escapes a plain hash next to underline html", () => {
    const underline = (text: string): NodeJson => ({ type: "text", text, marks: [{ type: "underline" }] });
    const markdown = serializeDoc(doc(
      { type: "paragraph", content: [underline("#under")] },
      { type: "paragraph", content: [underline("u"), { type: "text", text: "#after" }] },
    ));
    expect(markdown).toBe("<u>\\#under</u>\n\n<u>u</u>\\#after");
    expect(tagsIn(markdown)).toEqual([]);
  });

  it("escapes a plain hash right after inline code", () => {
    const markdown = serializeDoc(doc({
      type: "paragraph",
      content: [{ type: "text", text: "x", marks: [{ type: "code" }] }, { type: "text", text: "#foo bar" }],
    }));
    expect(markdown).toBe("`x`\\#foo bar");
    expect(tagsIn(markdown)).toEqual([]);
  });

  it("leaves hashes in link text alone", () => {
    const markdown = serializeDoc(doc({
      type: "paragraph",
      content: [{ type: "text", text: "#linked", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }],
    }));
    expect(markdown).toBe("[#linked](https://example.com)");
  });

  it("still writes tag nodes as tags", () => {
    expect(serializeDoc(doc({ type: "paragraph", content: [tagLink("work"), { type: "text", text: " done" }] }))).toBe("#work done");
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
