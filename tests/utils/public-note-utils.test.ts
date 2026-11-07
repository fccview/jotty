import { describe, it, expect } from "vitest";
import { copyableMarkdown } from "@/app/_utils/public-note-utils";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";

const FILE = "---\nuuid: 4b1c2d3e-1111-4222-8333-944455556666\ntitle: Plans\nsharedWith: public:r\n---\n# Plans\n\nHello";

describe("copyableMarkdown", () => {
  it("copies the body the public page renders, with no frontmatter", () => {
    const content = extractYamlMetadata(FILE).contentWithoutMetadata;
    const copied = copyableMarkdown({ content, encrypted: false });
    expect(copied).toContain("# Plans");
    expect(copied).not.toContain("---");
    expect(copied).not.toContain("sharedWith");
  });

  it("refuses to copy an encrypted note", () => {
    expect(copyableMarkdown({ content: "-----BEGIN PGP MESSAGE-----", encrypted: true })).toBeNull();
  });
});
