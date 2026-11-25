import { describe, it, expect, vi } from "vitest";
import { parseMarkdown } from "@/app/_utils/checklist-utils";
import { parseChecklistContent } from "@/app/_utils/client-parser-utils";

vi.unmock("@/app/_utils/checklist-utils");

const markdown = "# Shopping\n\n- [ ] milk\n- [X] eggs\n";

const parsers = {
  server: (md: string) => parseMarkdown(md, "shopping", "Uncategorized").items,
  client: (md: string) => parseChecklistContent(md, "shopping").items,
};

describe("checklist item checked with an uppercase X", () => {
  Object.entries(parsers).forEach(([side, parse]) => {
    it(`is read as completed in the ${side} parser`, () => {
      const [, eggs] = parse(markdown);

      expect(eggs).toMatchObject({ text: "eggs", completed: true });
    });
  });
});
