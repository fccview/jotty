// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.unmock("unified");
vi.unmock("unist-util-visit");

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/app/_providers/AppModeProvider", () => ({ useAppMode: () => ({ user: null }) }));
vi.mock("@/app/_providers/ToastProvider", () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock("@/app/_components/FeatureComponents/Tags/TagLinkComponent", () => ({
  TagLinkViewComponent: ({ tag }: { tag: string }) => <span data-pill={tag}>{tag}</span>,
}));

import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { UnifiedMarkdownRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/UnifiedMarkdownRenderer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const README = [
  "* [FOREWORD](#foreword)",
  "* [STRINGS](#strings)",
  "    * [Trim leading and trailing white-space from string](#trim-leading-and-trailing-white-space-from-string)",
  "",
  "## FOREWORD",
  "",
  "Some text #todo",
  "",
  "## STRINGS",
  "",
  "### Trim leading and trailing white-space from string",
].join("\n");

let host: HTMLElement;
let root: Root;

const render = async (content: string) => {
  await act(async () => root.render(<UnifiedMarkdownRenderer content={content} showStats={false} />));
  return host;
};

describe("UnifiedMarkdownRenderer tags", () => {
  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
  });

  it("renders anchor links as links to their headings instead of tag pills", async () => {
    const view = await render(README);
    const hrefs = Array.from(view.querySelectorAll("a")).map((link) => link.getAttribute("href"));
    const ids = Array.from(view.querySelectorAll("h2, h3")).map((heading) => heading.id);
    const pills = Array.from(view.querySelectorAll("[data-pill]")).map((pill) => pill.getAttribute("data-pill"));

    expect(hrefs).toEqual(["#foreword", "#strings", "#trim-leading-and-trailing-white-space-from-string"]);
    expect(ids).toEqual(["foreword", "strings", "trim-leading-and-trailing-white-space-from-string"]);
    expect(pills).toEqual(["todo"]);
    expect(view.textContent).not.toContain("](");
  });

  it("still tags hashtags outside code and html attributes", async () => {
    const view = await render('<span style="color: #ff0000">red</span> #tag and `#code`\n\n```\n#fenced\n```');
    const pills = Array.from(view.querySelectorAll("[data-pill]")).map((pill) => pill.getAttribute("data-pill"));

    expect(pills).toEqual(["tag"]);
  });

  it("skips a hashtag that opens bold glued to the word before it", async () => {
    const view = await render("foo**#bar** and **#ok** and _#fine_");
    const pills = Array.from(view.querySelectorAll("[data-pill]")).map((pill) => pill.getAttribute("data-pill"));

    expect(pills).toEqual(["ok", "fine"]);
  });

  it("skips escaped hashtags and hashtags glued to formatting", async () => {
    const view = await render("plain \\#escaped **bold**#glued #real\n\n**#inside** <b>#html</b> `c`#coded");
    const pills = Array.from(view.querySelectorAll("[data-pill]")).map((pill) => pill.getAttribute("data-pill"));

    expect(pills).toEqual(["real", "inside", "html", "coded"]);
  });
});
