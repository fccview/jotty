import { describe, it, expect } from "vitest";
import {
  normalizeTag,
  getAncestorTags,
  getParentTag,
  getDisplayName,
  buildTagsIndex,
  extractHashtagsFromContent,
  tagMatchesFilter,
  getAllUniqueTags,
  buildTagTree,
  getChildTags,
} from "@/app/_utils/tag-utils";

describe("Tag Utils", () => {
  describe("normalizeTag", () => {
    it("should lowercase tags", () => {
      expect(normalizeTag("MyTag")).toBe("mytag");
    });

    it("should trim whitespace", () => {
      expect(normalizeTag("  tag  ")).toBe("tag");
    });

    it("should remove leading hash", () => {
      expect(normalizeTag("#hashtag")).toBe("hashtag");
    });

    it("should handle combined cases", () => {
      expect(normalizeTag("  #MyTag  ")).toBe("mytag");
    });

    it("should handle nested tags", () => {
      expect(normalizeTag("#work/project")).toBe("work/project");
    });
  });

  describe("getAncestorTags", () => {
    it("should return empty array for root tags", () => {
      expect(getAncestorTags("work")).toEqual([]);
    });

    it("should return parent for nested tags", () => {
      expect(getAncestorTags("work/project")).toEqual(["work"]);
    });

    it("should return all ancestors for deeply nested tags", () => {
      expect(getAncestorTags("work/project/2024")).toEqual([
        "work",
        "work/project",
      ]);
    });

    it("should return correct ancestors for very deep nesting", () => {
      expect(getAncestorTags("a/b/c/d")).toEqual(["a", "a/b", "a/b/c"]);
    });
  });

  describe("getParentTag", () => {
    it("should return null for root tags", () => {
      expect(getParentTag("work")).toBeNull();
    });

    it("should return parent for nested tags", () => {
      expect(getParentTag("work/project")).toBe("work");
    });

    it("should return immediate parent for deeply nested tags", () => {
      expect(getParentTag("work/project/2024")).toBe("work/project");
    });
  });

  describe("getDisplayName", () => {
    it("should return tag name for root tags", () => {
      expect(getDisplayName("work")).toBe("work");
    });

    it("should return last segment for nested tags", () => {
      expect(getDisplayName("work/project")).toBe("project");
    });

    it("should return last segment for deeply nested tags", () => {
      expect(getDisplayName("work/project/2024")).toBe("2024");
    });
  });

  describe("extractHashtagsFromContent", () => {
    it("should extract simple hashtags", () => {
      const content = "This is a #test note";
      expect(extractHashtagsFromContent(content)).toContain("test");
    });

    it("should extract multiple hashtags", () => {
      const content = "Note with #tag1 and #tag2";
      const tags = extractHashtagsFromContent(content);
      expect(tags).toContain("tag1");
      expect(tags).toContain("tag2");
    });

    it("should extract nested hashtags", () => {
      const content = "Project #work/development";
      expect(extractHashtagsFromContent(content)).toContain("work/development");
    });

    it("should extract data-tag attributes", () => {
      const content = '<span data-tag="important">Tag</span>';
      expect(extractHashtagsFromContent(content)).toContain("important");
    });

    it("should normalize extracted tags", () => {
      const content = "Testing #MyUpperTag";
      expect(extractHashtagsFromContent(content)).toContain("myuppertag");
    });

    it("should ignore hashtags in code blocks", () => {
      const content = "Text ```code #notag``` more text #realtag";
      const tags = extractHashtagsFromContent(content);
      expect(tags).not.toContain("notag");
      expect(tags).toContain("realtag");
    });

    it("should ignore hashtags in inline code", () => {
      const content = "Text `#notag` more text #realtag";
      const tags = extractHashtagsFromContent(content);
      expect(tags).not.toContain("notag");
      expect(tags).toContain("realtag");
    });

    it("should deduplicate tags", () => {
      const content = "#tag #tag #tag";
      const tags = extractHashtagsFromContent(content);
      expect(tags.filter((t) => t === "tag")).toHaveLength(1);
    });

    it("should reject invalid tag formats with double slashes", () => {
      const content = "#invalid//tag #valid";
      const tags = extractHashtagsFromContent(content);
      expect(tags).not.toContain("invalid//tag");
      expect(tags).toContain("valid");
    });

    it("should reject tags ending with slash", () => {
      const content = "#invalid/ #valid";
      const tags = extractHashtagsFromContent(content);
      expect(tags).not.toContain("invalid/");
      expect(tags).toContain("valid");
    });

    it("should handle tags at start of line", () => {
      const content = "#starttag\nsome text";
      expect(extractHashtagsFromContent(content)).toContain("starttag");
    });

    it("should handle tags after whitespace", () => {
      const content = "text    #spacedtag";
      expect(extractHashtagsFromContent(content)).toContain("spacedtag");
    });

    it("should handle tags after parenthesis", () => {
      const content = "text (#parentag)";
      expect(extractHashtagsFromContent(content)).toContain("parentag");
    });

    it("should extract tags with underscores", () => {
      const content = "#my_tag";
      expect(extractHashtagsFromContent(content)).toContain("my_tag");
    });

    it("should extract tags with numbers", () => {
      const content = "#tag123";
      expect(extractHashtagsFromContent(content)).toContain("tag123");
    });

    it("should ignore tags in pre tags", () => {
      const content = "Text <pre>#notag</pre> more #realtag";
      const tags = extractHashtagsFromContent(content);
      expect(tags).not.toContain("notag");
      expect(tags).toContain("realtag");
    });

    it("should ignore tags in code tags", () => {
      const content = "Text <code>#notag</code> more #realtag";
      const tags = extractHashtagsFromContent(content);
      expect(tags).not.toContain("notag");
      expect(tags).toContain("realtag");
    });

    it("should return empty array for content without tags", () => {
      const content = "This is a note without any tags";
      expect(extractHashtagsFromContent(content)).toEqual([]);
    });
  });

  describe("buildTagsIndex", () => {
    it("should build index from notes with tags", () => {
      const notes = [
        { uuid: "note1", tags: ["work", "project"] },
        { uuid: "note2", tags: ["work"] },
      ];
      const index = buildTagsIndex(notes);

      expect(index["work"]).toBeDefined();
      expect(index["project"]).toBeDefined();
    });

    it("should track note UUIDs per tag", () => {
      const notes = [
        { uuid: "note1", tags: ["work"] },
        { uuid: "note2", tags: ["work"] },
      ];
      const index = buildTagsIndex(notes);

      expect(index["work"].noteUuids).toContain("note1");
      expect(index["work"].noteUuids).toContain("note2");
    });

    it("should not duplicate UUIDs", () => {
      const notes = [{ uuid: "note1", tags: ["work", "work"] }];
      const index = buildTagsIndex(notes);

      expect(index["work"].noteUuids).toHaveLength(1);
    });

    it("should create parent tags for nested tags", () => {
      const notes = [{ uuid: "note1", tags: ["work/project"] }];
      const index = buildTagsIndex(notes);

      expect(index["work"]).toBeDefined();
      expect(index["work/project"]).toBeDefined();
    });

    it("should set correct parent references", () => {
      const notes = [{ uuid: "note1", tags: ["work/project/2024"] }];
      const index = buildTagsIndex(notes);

      expect(index["work/project/2024"].parent).toBe("work/project");
      expect(index["work/project"].parent).toBe("work");
      expect(index["work"].parent).toBeNull();
    });

    it("should calculate total count including descendants", () => {
      const notes = [
        { uuid: "note1", tags: ["work"] },
        { uuid: "note2", tags: ["work/project"] },
      ];
      const index = buildTagsIndex(notes);

      expect(index["work"].totalCount).toBe(2);
      expect(index["work/project"].totalCount).toBe(1);
    });

    it("should skip notes without tags", () => {
      const notes = [
        { uuid: "note1" },
        { uuid: "note2", tags: ["work"] },
      ];
      const index = buildTagsIndex(notes);

      expect(Object.keys(index)).toHaveLength(1);
      expect(index["work"]).toBeDefined();
    });

    it("should skip notes without uuid", () => {
      const notes = [
        { tags: ["orphan"] },
        { uuid: "note2", tags: ["work"] },
      ];
      const index = buildTagsIndex(notes);

      expect(index["orphan"]).toBeUndefined();
      expect(index["work"]).toBeDefined();
    });

    it("should skip empty tags after normalization", () => {
      const notes = [{ uuid: "note1", tags: ["", "valid"] }];
      const index = buildTagsIndex(notes);

      expect(index[""]).toBeUndefined();
      expect(index["valid"]).toBeDefined();
    });

    it("should set correct display names", () => {
      const notes = [{ uuid: "note1", tags: ["work/project"] }];
      const index = buildTagsIndex(notes);

      expect(index["work"].displayName).toBe("work");
      expect(index["work/project"].displayName).toBe("project");
    });
  });

  describe("tagMatchesFilter", () => {
    it("should match exact tags", () => {
      expect(tagMatchesFilter("work", "work")).toBe(true);
    });

    it("should match child tags", () => {
      expect(tagMatchesFilter("work/project", "work")).toBe(true);
    });

    it("should not match parent tags", () => {
      expect(tagMatchesFilter("work", "work/project")).toBe(false);
    });

    it("should not match unrelated tags", () => {
      expect(tagMatchesFilter("personal", "work")).toBe(false);
    });

    it("should handle case insensitivity", () => {
      expect(tagMatchesFilter("Work", "work")).toBe(true);
    });

    it("should handle tags with leading hash", () => {
      expect(tagMatchesFilter("#work", "work")).toBe(true);
    });

    it("should match deeply nested children", () => {
      expect(tagMatchesFilter("work/project/2024/q1", "work")).toBe(true);
    });

    it("should not match similar but different tags", () => {
      expect(tagMatchesFilter("working", "work")).toBe(false);
    });
  });

  describe("getAllUniqueTags", () => {
    it("should return all unique tags from notes", () => {
      const notes = [
        { tags: ["work", "project"] },
        { tags: ["work", "personal"] },
      ];
      const tags = getAllUniqueTags(notes);

      expect(tags).toContain("work");
      expect(tags).toContain("project");
      expect(tags).toContain("personal");
    });

    it("should deduplicate tags", () => {
      const notes = [{ tags: ["work"] }, { tags: ["work"] }];
      const tags = getAllUniqueTags(notes);

      expect(tags.filter((t) => t === "work")).toHaveLength(1);
    });

    it("should normalize tags", () => {
      const notes = [{ tags: ["Work"] }, { tags: ["WORK"] }];
      const tags = getAllUniqueTags(notes);

      expect(tags).toHaveLength(1);
      expect(tags[0]).toBe("work");
    });

    it("should return sorted tags", () => {
      const notes = [{ tags: ["zebra", "alpha", "middle"] }];
      const tags = getAllUniqueTags(notes);

      expect(tags).toEqual(["alpha", "middle", "zebra"]);
    });

    it("should handle notes without tags", () => {
      const notes = [{ tags: ["work"] }, {}];
      const tags = getAllUniqueTags(notes);

      expect(tags).toEqual(["work"]);
    });

    it("should return empty array for no tags", () => {
      const notes = [{}, {}];
      const tags = getAllUniqueTags(notes);

      expect(tags).toEqual([]);
    });
  });

  describe("buildTagTree", () => {
    it("should return only root tags", () => {
      const notes = [
        { uuid: "note1", tags: ["work", "personal"] },
        { uuid: "note2", tags: ["work/project"] },
      ];
      const index = buildTagsIndex(notes);
      const tree = buildTagTree(index);

      expect(tree.map((t) => t.name)).toContain("work");
      expect(tree.map((t) => t.name)).toContain("personal");
      expect(tree.map((t) => t.name)).not.toContain("work/project");
    });

    it("should sort root tags alphabetically", () => {
      const notes = [{ uuid: "note1", tags: ["zebra", "alpha", "middle"] }];
      const index = buildTagsIndex(notes);
      const tree = buildTagTree(index);

      expect(tree[0].name).toBe("alpha");
      expect(tree[1].name).toBe("middle");
      expect(tree[2].name).toBe("zebra");
    });

    it("should return empty array for empty index", () => {
      const tree = buildTagTree({});
      expect(tree).toEqual([]);
    });
  });

  describe("getChildTags", () => {
    it("should return direct children only", () => {
      const notes = [
        { uuid: "note1", tags: ["work/project", "work/meetings"] },
        { uuid: "note2", tags: ["work/project/2024"] },
      ];
      const index = buildTagsIndex(notes);
      const children = getChildTags(index, "work");

      expect(children.map((t) => t.name)).toContain("work/project");
      expect(children.map((t) => t.name)).toContain("work/meetings");
      expect(children.map((t) => t.name)).not.toContain("work/project/2024");
    });

    it("should sort children alphabetically", () => {
      const notes = [
        { uuid: "note1", tags: ["work/zebra", "work/alpha", "work/middle"] },
      ];
      const index = buildTagsIndex(notes);
      const children = getChildTags(index, "work");

      expect(children[0].name).toBe("work/alpha");
      expect(children[1].name).toBe("work/middle");
      expect(children[2].name).toBe("work/zebra");
    });

    it("should return empty array for tags without children", () => {
      const notes = [{ uuid: "note1", tags: ["work"] }];
      const index = buildTagsIndex(notes);
      const children = getChildTags(index, "work");

      expect(children).toEqual([]);
    });

    it("should return empty array for non-existent parent", () => {
      const notes = [{ uuid: "note1", tags: ["work"] }];
      const index = buildTagsIndex(notes);
      const children = getChildTags(index, "nonexistent");

      expect(children).toEqual([]);
    });
  });
});
