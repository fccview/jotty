import { describe, it, expect, vi } from "vitest";

vi.unmock("unified");
vi.unmock("unist-util-visit");
vi.unmock("js-beautify");
vi.unmock("@/app/_utils/markdown-utils");

import fs from "fs";
import path from "path";
import { htmlToMarkdown, jottySchema } from "@/app/_server/actions/markdown/from-html";
import { happyKit, mendSource } from "@/app/_server/actions/markdown/happy-kit";
import { htmlToNodes, serializeOptions } from "@/app/_utils/markdown/editor-bridge";
import { loadMarkdown, saveMarkdown } from "@/app/_utils/markdown/session";

const BASE = "https://example.com/blog/post.html";

const convert = (html: string, baseUrl?: string) => htmlToMarkdown({ html, baseUrl });

const reloaded = async (markdown: string) => {
  const { kit, close } = happyKit();
  try {
    const schema = jottySchema();
    const { doc } = loadMarkdown(markdown, htmlToNodes(schema, kit));
    return saveMarkdown(doc, null, serializeOptions(schema, undefined, kit));
  } finally {
    await close();
  }
};

const CASES: [string, string, string][] = [
  ["headings and inline marks", "<h2>Title</h2><p>Some <strong>bold</strong>, <em>italic</em>, <s>gone</s>, <u>under</u> and <code>code</code></p>", "## Title\n\nSome **bold**, *italic*, ~~gone~~, <u>under</u> and `code`"],
  ["links", '<p>Read <a href="https://jotty.page">the docs</a></p>', "Read [the docs](https://jotty.page)"],
  ["highlights and text colour", '<p><mark>plain</mark> <mark data-color="#ffcc00">gold</mark> <span style="color: #ff0000">red</span></p>', '<mark>plain</mark> <mark style="background-color: #ffcc00; color: black">gold</mark> <span style="color: #ff0000">red</span>'],
  ["sub, sup, kbd and abbr", '<p>H<sub>2</sub>O x<sup>2</sup> <kbd>Ctrl</kbd> <abbr title="HyperText">HTML</abbr></p>', 'H<sub>2</sub>O x<sup>2</sup> <kbd>Ctrl</kbd> <abbr title="HyperText">HTML</abbr>'],
  ["sized images", '<img src="https://example.com/a.png" alt="pic" width="200" height="100">', '<img src="https://example.com/a.png" alt="pic" width="200" height="100" />'],
  ["blockquotes", "<blockquote><p>quoted</p></blockquote>", "> quoted"],
  ["callouts", '<div data-type="callout" data-callout-type="warning"><p>careful</p></div>', "> [!WARNING]\n> careful"],
  ["details", "<details><summary>More</summary><div><p>hidden</p></div></details>", "<details>\n<summary>More</summary>\n\nhidden\n\n</details>"],
  ["bullet and ordered lists", "<ul><li>a</li><li>b<ul><li>c</li></ul></li></ul><ol><li>one</li><li>two</li></ol>", "- a\n- b\n  - c\n\n1. one\n2. two"],
  ["jotty task lists", '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>done</p></li><li data-type="taskItem" data-checked="false"><p>todo</p></li></ul>', "- [x] done\n- [ ] todo"],
  ["github task lists", '<ul class="contains-task-list"><li class="task-list-item"><input type="checkbox" checked=""> done</li><li class="task-list-item"><input type="checkbox"> todo</li></ul>', "- [x] done\n- [ ] todo"],
  ["ordered checkbox lists", '<ol><li><input type="checkbox" checked> done</li><li><input type="checkbox"> todo</li></ol>', "- [x] done\n- [ ] todo"],
  ["code with a language", '<pre><code class="language-js">const a = 1;\nconsole.log(a);</code></pre>', "```js\nconst a = 1;\nconsole.log(a);\n```"],
  ["highlighted code split into spans", '<pre><code class="language-js"><span>const a = 1;</span>\n<span>console.log(a);</span></code></pre>', "```js\nconst a = 1;\nconsole.log(a);\n```"],
  ["mermaid", '<div data-mermaid="" data-mermaid-content="graph TD; A-->B"></div>', "```mermaid\ngraph TD; A-->B\n```"],
  ["tables", "<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>", "| A   | B   |\n| --- | --- |\n| 1   | 2   |"],
  ["rules and hard breaks", "<p>a</p><hr><p>b<br>c</p>", "a\n\n---\n\nb  \nc"],
  ["whole pages without scripts", "<html><head><title>x</title><script>alert(1)</script></head><body><h1>Page</h1><p>body</p></body></html>", "# Page\n\nbody"],
];

describe("html to markdown through the editor schema", () => {
  it.each(CASES)("converts %s", async (_label, html, expected) => {
    expect(await convert(html)).toBe(expected);
  });

  it.each(CASES)("round trips %s through the markdown loader", async (_label, html) => {
    const markdown = await convert(html);
    expect(await reloaded(markdown)).toBe(markdown);
  });

  it("returns an empty string when nothing survives", async () => {
    expect(await convert("   ")).toBe("");
    expect(await convert("<script>alert(1)</script>")).toBe("");
  });

  it("resolves relative links and images against the base url", async () => {
    const markdown = await convert(
      '<p><a href="/about">about</a> <a href="next.html">next</a> <a href="mailto:a@b.c">mail</a></p><img src="img/a.png">',
      BASE,
    );
    expect(markdown).toBe(
      '[about](https://example.com/about) [next](https://example.com/blog/next.html) [mail](mailto:a@b.c)\n\n![](https://example.com/blog/img/a.png)',
    );
  });

  it("leaves relative links alone without a base url", async () => {
    expect(await convert('<p><a href="/about">about</a></p>')).toBe("[about](/about)");
  });

  it("keeps mixed lists as plain lists", async () => {
    expect(await convert('<ul><li><input type="checkbox"> a</li><li>b</li></ul>')).toBe("- a\n- b");
  });

  it("reads stray comment closers and lone angle brackets as text", async () => {
    expect(mendSource("<p>a --> b <!-- c --> 1 <2</p>")).toBe("<p>a --&gt; b <!-- c --> 1 &lt;2</p>");
    expect(await convert("<pre><code>A-->B</code></pre>")).toBe("```\nA-->B\n```");
  });

  it("mends megabytes of unclosed comments without stalling", () => {
    const unclosed = "<!--".repeat(1_300_000);
    expect(mendSource(unclosed)).toBe(unclosed);
    expect(mendSource("a<!--x-->b<!--y")).toBe("a<!--x-->b<!--y");
  });
});

const CLIENT_ONLY = /^(react|react-dom|@tiptap\/react|yjs|y-protocols|next-intl|hugeicons-react)(\/|$)|_components\//;
const IMPORT = /^\s*import\s+(?:type\s)?[\s\S]*?from\s+"([^"]+)";/gm;

const resolveLocal = (specifier: string, from: string) => {
  const base = specifier.startsWith("@/")
    ? path.join(process.cwd(), specifier.slice(2))
    : path.resolve(path.dirname(from), specifier);
  return [".ts", ".tsx", "/index.ts"].map((ext) => base + ext).find((file) => fs.existsSync(file));
};

const importsOf = (entry: string) => {
  const seen = new Set<string>();
  const packages = new Set<string>();
  const walk = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    Array.from(fs.readFileSync(file, "utf8").matchAll(IMPORT), (match) => match[1]).forEach((specifier) => {
      if (!specifier.startsWith(".") && !specifier.startsWith("@/")) return packages.add(specifier);
      const local = resolveLocal(specifier, file);
      if (local) walk(local);
    });
  };
  walk(entry);
  return [...Array.from(packages), ...Array.from(seen)];
};

describe("server conversion imports", () => {
  it("never pulls in React, node views or collaboration", () => {
    const entry = path.join(process.cwd(), "app", "_server", "actions", "markdown", "from-html.ts");
    expect(importsOf(entry).filter((name) => CLIENT_ONLY.test(name))).toEqual([]);
  });
});
