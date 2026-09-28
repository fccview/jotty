import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { metaGrep, scanFrontmatter, MetaCache } from "@/app/_utils/frontmatter-scan";

const KEYS = ["title", "uuid", "tags", "encrypted", "createdAt", "sharedWith"];

const PLAN_NOTE = `---
uuid: 32a02266-964f-48fb-b3e7-94476908d984
title: degoog New plan
tags:
  - degoog
---

## 1. Engines

- **Registry** in engines.ts
    - \`id: string\`, \`label: string\`
    - Nested again
        - Deeper still

---

## 2. Slot plugins

- **Types** in types.ts: Add \`SlotPlugin\`
    - \`id: string\`, \`name\` / \`displayName: string\`
    - **Sidebar**: Inside the results sidebar
        - \`position: number\`

---

tags:
  - not-a-tag

#degoog
`;

const _scan = (dir: string): MetaCache => {
  const out = execFileSync("sh", ["-c", metaGrep(KEYS), "sh", dir], { encoding: "utf-8" });
  const cache: MetaCache = new Map();
  scanFrontmatter(out, cache);
  return cache;
};

describe("scanFrontmatter", () => {
  let dir: string;

  const write = (name: string, content: string) => {
    const filePath = path.join(dir, name);
    fs.writeFileSync(filePath, content);
    return filePath;
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "jotty-fm-scan-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("should not read body list items between horizontal rules as tags", () => {
    const filePath = write("plan.md", PLAN_NOTE);

    const meta = _scan(dir).get(filePath);

    expect(meta?.tags).toEqual(["degoog"]);
    expect(meta?.title).toBe("degoog New plan");
    expect(meta?.uuid).toBe("32a02266-964f-48fb-b3e7-94476908d984");
  });

  it("should read inline tags and plain keys", () => {
    const filePath = write("inline.md", "---\ntitle: \"Quoted\"\ntags: [a, b]\nencrypted: true\n---\n\n- item\n");

    const meta = _scan(dir).get(filePath);

    expect(meta).toEqual({ title: "Quoted", tags: ["a", "b"], encrypted: true });
  });

  it("should stop a list at the first line that is not one of its items", () => {
    const filePath = write(
      "gap.md",
      "---\ntags:\n  - one\n  - two\nother:\n  - stray\nsharedWith:\n  - alice\n---\n",
    );

    const meta = _scan(dir).get(filePath);

    expect(meta?.tags).toEqual(["one", "two"]);
    expect(meta?.sharedWith).toEqual(["alice"]);
  });

  it("should ignore files whose first line is not a fence", () => {
    const filePath = write("nofm.md", "# Title\n\n---\ntags:\n  - fake\n---\n");

    expect(_scan(dir).has(filePath)).toBe(false);
  });

  it("should ignore frontmatter that never closes", () => {
    const filePath = write("open.md", "---\ntitle: Open\ntags:\n  - fake\n\nbody\n");

    expect(_scan(dir).has(filePath)).toBe(false);
  });

  it("should keep each file separate", () => {
    const plan = write("plan.md", PLAN_NOTE);
    const post = write("post.md", "---\ntitle: Degoog blog post\ntags:\n  - degoog\n---\n\nBody\n");

    const cache = _scan(dir);

    expect(cache.get(plan)?.tags).toEqual(["degoog"]);
    expect(cache.get(post)?.tags).toEqual(["degoog"]);
  });
});
