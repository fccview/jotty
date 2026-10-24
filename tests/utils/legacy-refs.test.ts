import { describe, it, expect, vi } from "vitest";

vi.unmock("unified");
vi.unmock("unist-util-visit");

import { scanAttachments, scanLegacy, swapRefs } from "@/app/_utils/legacy-refs";
import { AttachmentKinds } from "@/app/_consts/attachments";

const ORIGIN = "https://notes.example.com";

const refsOf = (body: string) => scanLegacy(body, [ORIGIN])!.refs;

describe("scanLegacy", () => {
  it("finds images, file links, videos and link definitions", () => {
    const body = [
      "![cat](/api/image/alice/cat.png)",
      "[📎 report.pdf](/api/file/alice/report.pdf)",
      "[🎥 clip](/api/video/alice/clip.mp4)",
      "",
      "[ref]: /api/image/alice/def.png",
    ].join("\n");

    expect(refsOf(body).map((ref) => [ref.kind, ref.owner, ref.name])).toEqual([
      [AttachmentKinds.IMAGE, "alice", "cat.png"],
      [AttachmentKinds.FILE, "alice", "report.pdf"],
      [AttachmentKinds.VIDEO, "alice", "clip.mp4"],
      [AttachmentKinds.IMAGE, "alice", "def.png"],
    ]);
  });

  it("finds src and href in raw HTML", () => {
    const body = '<img src="/api/image/alice/a.png" width="200"> and <a href=\'/api/file/alice/b.pdf\'>b</a>';
    expect(refsOf(body).map((ref) => ref.name)).toEqual(["a.png", "b.pdf"]);
  });

  it("never touches fenced code or inline code", () => {
    const body = [
      "```",
      "![x](/api/image/alice/in-fence.png)",
      "```",
      "",
      "Use `![x](/api/image/alice/inline.png)` to embed.",
      "",
      "![real](/api/image/alice/real.png)",
    ].join("\n");

    expect(refsOf(body).map((ref) => ref.name)).toEqual(["real.png"]);
  });

  it("leaves URLs in plain text alone and reports them as loose", () => {
    const scan = scanLegacy("See /api/image/alice/text.png for details", [ORIGIN])!;
    expect(scan.refs).toEqual([]);
    expect(scan.loose).toEqual(["/api/image/alice/text.png"]);
  });

  it("accepts its own origin and refuses another", () => {
    const scan = scanLegacy(
      `![a](${ORIGIN}/api/image/alice/a.png) ![b](https://elsewhere.test/api/image/alice/b.png)`,
      [ORIGIN],
    )!;
    expect(scan.refs.map((ref) => ref.name)).toEqual(["a.png"]);
    expect(scan.foreign).toEqual(["https://elsewhere.test/api/image/alice/b.png"]);
  });

  it("decodes encoded names", () => {
    expect(refsOf("![a](/api/image/al%20ice/my%20cat.png)")[0]).toMatchObject({
      owner: "al ice",
      name: "my cat.png",
    });
  });
});

describe("swapRefs", () => {
  it("replaces by offset and keeps any query or hash", () => {
    const body = "![a](/api/image/alice/a.png?v=2) then ![a again](/api/image/alice/a.png)";
    const refs = refsOf(body);
    const swapped = swapRefs(
      body,
      refs.map((ref) => ({ ref, url: "/api/attachment/u/a.png" })),
    );

    expect(swapped).toBe(
      "![a](/api/attachment/u/a.png?v=2) then ![a again](/api/attachment/u/a.png)",
    );
  });

  it("leaves everything around the URL byte for byte", () => {
    const body = "  ![a](/api/image/alice/a.png \"title\")\r\n- [ ] task | description:![x](/api/image/alice/x.png)\r\n";
    const refs = refsOf(body);
    const swapped = swapRefs(body, refs.map((ref) => ({ ref, url: `/new/${ref.name}` })));
    expect(swapped).toBe(
      "  ![a](/new/a.png \"title\")\r\n- [ ] task | description:![x](/new/x.png)\r\n",
    );
  });
});

describe("scanAttachments", () => {
  const ITEM = "11111111-1111-4111-8111-111111111111";

  it("finds attachment URLs in links, images and html, never in code", () => {
    const body = [
      `![a](/api/attachment/${ITEM}/a%20b.png)`,
      `<img src="${ORIGIN}/api/attachment/${ITEM.toUpperCase()}/c.png">`,
      `\`/api/attachment/${ITEM}/code.png\``,
      `/api/attachment/${ITEM}/loose.png`,
      `![f](https://elsewhere.example/api/attachment/${ITEM}/far.png)`,
    ].join("\n\n");

    expect(scanAttachments(body, [ORIGIN]).map(({ item, name }) => [item, name])).toEqual([
      [ITEM, "a b.png"],
      [ITEM, "c.png"],
    ]);
  });
});
