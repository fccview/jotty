import { describe, it, expect } from "vitest";
import { parseChecklistContent } from "@/app/_utils/client-parser-utils";
import { Item } from "@/app/_types";

const collectIds = (items: Item[], acc: string[] = []): string[] => {
  items.forEach((item) => {
    acc.push(item.id);
    if (item.children && item.children.length > 0) {
      collectIds(item.children, acc);
    }
  });
  return acc;
};

describe("parseChecklistContent — unique item IDs", () => {
  it("assigns unique IDs to every item across nested groups (regression for #501)", () => {
    const lines: string[] = [];
    for (let g = 1; g <= 4; g++) {
      lines.push(`- [ ] Group ${g}`);
      for (let i = 1; i <= 5; i++) {
        lines.push(`  - [ ] Item ${g}.${i}`);
      }
    }
    const content = lines.join("\n");

    const { items } = parseChecklistContent(content, "my-list");
    const ids = collectIds(items);

    expect(ids).toHaveLength(4 + 4 * 5);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("preserves IDs stored in inline item metadata", () => {
    const content = [
      "- [ ] Item with stored id | metadata:{\"id\":\"stored-id-1\"}",
      "- [ ] Item without stored id",
    ].join("\n");

    const { items } = parseChecklistContent(content, "my-list");

    expect(items[0].id).toBe("stored-id-1");
    expect(items[1].id).not.toBe("stored-id-1");
    expect(items[1].id).toBeTruthy();
  });

  it("dedupes IDs from already-broken imported files", () => {
    const content = [
      "- [ ] Group A | metadata:{\"id\":\"file-0\"}",
      "  - [ ] Item A1 | metadata:{\"id\":\"file-0\"}",
      "  - [ ] Item A2 | metadata:{\"id\":\"file-1\"}",
      "- [ ] Group B | metadata:{\"id\":\"file-1\"}",
      "  - [ ] Item B1 | metadata:{\"id\":\"file-2\"}",
    ].join("\n");

    const { items } = parseChecklistContent(content, "file");
    const ids = collectIds(items);

    expect(new Set(ids).size).toBe(ids.length);
    expect(items[0].id).toBe("file-0");
    expect(items[0].children?.[0].id).not.toBe("file-0");
  });
});
