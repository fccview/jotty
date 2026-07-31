import { describe, it, expect } from "vitest";
import { decodeSegment, decodeCategoryPath } from "@/app/_utils/global-utils";

describe("decodeSegment", () => {
  it("should decode a valid percent-encoded segment", () => {
    expect(decodeSegment("my%20note")).toBe("my note");
  });

  it("should decode multi-byte utf-8 sequences", () => {
    expect(decodeSegment("caf%C3%A9")).toBe("café");
  });

  it("should return a lone percent verbatim", () => {
    expect(decodeSegment("%")).toBe("%");
  });

  it("should return an invalid hex escape verbatim", () => {
    expect(decodeSegment("%ZZ")).toBe("%ZZ");
  });

  it("should return a truncated utf-8 sequence verbatim", () => {
    expect(decodeSegment("%C3")).toBe("%C3");
  });

  it("should return an illegal continuation byte verbatim", () => {
    expect(decodeSegment("%E0%A4%A")).toBe("%E0%A4%A");
  });

  it("should leave an unencoded segment untouched", () => {
    expect(decodeSegment("plain-slug")).toBe("plain-slug");
  });

  it("should keep every segment of a malformed category path", () => {
    expect(decodeCategoryPath("Work/%ZZ/Notes")).toBe("Work/%ZZ/Notes");
  });
});
