import { describe, it, expect, vi } from "vitest";

vi.unmock("@/app/_utils/markdown-utils");

import {
  FIND_AMBIGUOUS,
  FIND_MISSING,
  addHashtags,
  cleanTag,
  dropHashtags,
  findReplace,
} from "@/app/_utils/note-edits";

describe("findReplace", () => {
  it("lets the end of the note stand in for a closing newline", () => {
    expect(findReplace("## Blockers\n\n## Handover", "## Handover\n", "## Handover\n- entry\n")).toEqual({
      body: "## Blockers\n\n## Handover\n- entry\n",
    });
  });

  it("does the same for CRLF notes", () => {
    expect(findReplace("a\r\n## Handover", "## Handover\n", "## Handover\n- x\n")).toEqual({
      body: "a\r\n## Handover\r\n- x\r\n",
    });
  });

  it("still refuses a heading that only appears mid-line", () => {
    expect(findReplace("see ## Handover later", "## Handover\n", "x")).toEqual({ error: FIND_MISSING });
  });

  it("swaps a unique match and leaves the rest alone", () => {
    expect(findReplace("one\ntwo\nthree\n", "two", "2")).toEqual({ body: "one\n2\nthree\n" });
  });

  it("refuses a missing or repeated match", () => {
    expect(findReplace("a b a", "c", "x")).toEqual({ error: FIND_MISSING });
    expect(findReplace("a b a", "a", "x")).toEqual({ error: FIND_AMBIGUOUS });
  });

  it("matches LF input against a CRLF note and writes CRLF back", () => {
    const body = "Intro\r\nold line\r\nnext\r\n";
    expect(findReplace(body, "old line\nnext", "new line\nnext")).toEqual({
      body: "Intro\r\nnew line\r\nnext\r\n",
    });
  });

  it("defangs script tags in the inserted text", () => {
    const result = findReplace("x", "x", "<script>alert(1)</script>");
    expect(result).toEqual({ body: "&lt;script&gt;alert(1)&lt;/script&gt;" });
  });
});

describe("hashtags", () => {
  it("cleans tag names and refuses odd ones", () => {
    expect(cleanTag("#Garden/Veg")).toBe("garden/veg");
    expect(cleanTag("1st")).toBeNull();
    expect(cleanTag("two words")).toBeNull();
  });

  it("appends a tag line, or extends an existing one, keeping the ending", () => {
    expect(addHashtags("Notes here.\n", ["garden"])).toBe("Notes here.\n\n#garden\n");
    expect(addHashtags("Notes\r\n\r\n#garden\r\n", ["work"])).toBe("Notes\r\n\r\n#garden #work\r\n");
    expect(addHashtags("Has #garden inline", ["garden"])).toBe("Has #garden inline");
  });

  it("removes tags outside code and drops lines left empty", () => {
    const body = "Intro #garden text\n\n#garden\n\n```\n#garden\n```\n`#garden` #gardening\n";
    expect(dropHashtags(body, ["garden"])).toBe(
      "Intro text\n\n```\n#garden\n```\n`#garden` #gardening\n",
    );
  });

  it("keeps other tags on a shared tag line", () => {
    expect(dropHashtags("Body\n\n#garden #work\n", ["garden"])).toBe("Body\n\n#work\n");
  });
});
