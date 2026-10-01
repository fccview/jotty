import { describe, it, expect } from "vitest";
import { repairFrontmatter } from "@/app/_server/actions/lib/frontmatter-repair";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";

const UUID = "0b6c3c1e-1111-5222-8333-944455556666";

const metaOf = (content: string | null) => extractYamlMetadata(content || "").metadata;

describe("repairFrontmatter", () => {
  it("quotes values strict YAML rejects and keeps the body", () => {
    const fixed = repairFrontmatter("---\ntitle: Meeting: weekly sync\nauthor: @stan\ncode: `x`\n---\nbody stays", UUID);
    expect(metaOf(fixed)).toMatchObject({ uuid: UUID, title: "Meeting: weekly sync", author: "@stan", code: "`x`" });
    expect(fixed!.endsWith("body stays")).toBe(true);
  });

  it("turns indenting tabs into spaces and quotes list items", () => {
    const fixed = repairFrontmatter("---\naliases:\n\t- @handle\n\t- fine\n---\nbody", UUID);
    expect(metaOf(fixed)).toMatchObject({ uuid: UUID, aliases: ["@handle", "fine"] });
  });

  it("moves a uuid that is not a Jotty id aside as a string", () => {
    const fixed = repairFrontmatter("---\nuuid: 0123051212\ntags: x\n---\nbody", UUID);
    expect(metaOf(fixed)).toMatchObject({ uuid: UUID, previousUuid: "0123051212", tags: "x" });
  });

  it("leaves block scalars alone", () => {
    const fixed = repairFrontmatter("---\nnote: |\n  line: with colon\nother: a: b\n---\nbody", UUID);
    expect(metaOf(fixed)).toMatchObject({ note: "line: with colon\n", other: "a: b" });
  });

  it("stamps an empty file", () => {
    expect(metaOf(repairFrontmatter("", UUID))).toEqual({ uuid: UUID });
  });

  it("gives up on frontmatter it still can't parse", () => {
    expect(repairFrontmatter("---\ntags: a\ntags: b\n---\nbody", UUID)).toBeNull();
  });
});
