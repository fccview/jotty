import { describe, it, expect } from "vitest";
import { mergeTags, tagList, tagSources } from "@/app/_utils/tag-utils";
import { FrontmatterWarnings, frontmatterWarnings } from "@/app/_utils/frontmatter-warnings";

describe("mergeTags", () => {
  it("keeps tags that only live in the frontmatter", () => {
    expect(mergeTags(["manual"], "text #work", "text #work more")).toEqual(["manual", "work"]);
  });

  it("drops a tag when its hashtag leaves the text", () => {
    expect(mergeTags(["manual", "work"], "text #work", "text")).toEqual(["manual"]);
  });

  it("adds hashtags already in the text that the frontmatter never had", () => {
    expect(mergeTags([], "old #legacy", "old #legacy")).toEqual(["legacy"]);
  });

  it("keeps everything when the body is ciphertext", () => {
    const cipher = "-----BEGIN PGP MESSAGE-----\nabc\n-----END PGP MESSAGE-----";
    expect(mergeTags(["secret"], cipher, cipher)).toEqual(["secret"]);
  });
});

describe("tagList", () => {
  it("accepts a list or a comma separated string and normalises both", () => {
    expect(tagList(["Work", "#ideas", "work"])).toEqual(["ideas", "work"]);
    expect(tagList("work, ideas")).toEqual(["ideas", "work"]);
    expect(tagList(undefined)).toEqual([]);
  });
});

describe("tagSources", () => {
  it("says where each tag lives, and which ones the next save drops", () => {
    expect(tagSources(["both", "manual", "gone"], "#both #fresh", "#both #gone")).toEqual([
      { tag: "both", inText: true, inFrontmatter: true, leaving: false },
      { tag: "fresh", inText: true, inFrontmatter: false, leaving: false },
      { tag: "gone", inText: false, inFrontmatter: true, leaving: true },
      { tag: "manual", inText: false, inFrontmatter: true, leaving: false },
    ]);
  });
});

describe("frontmatterWarnings", () => {
  it("only warns about the keys that changed", () => {
    const before = "uuid: a\nencrypted: false\nstatus: draft\n";
    expect(frontmatterWarnings(before, "uuid: b\nencrypted: false\nstatus: final\n")).toEqual([
      FrontmatterWarnings.UUID,
    ]);
    expect(frontmatterWarnings(before, before)).toEqual([]);
    expect(frontmatterWarnings(before, "uuid: [broken")).toEqual([]);
  });
});
