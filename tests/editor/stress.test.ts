// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { freshSave, open, unchangedSave } from "./harness";
import { randomDocument, seeded } from "./generator";
import type { NodeJson } from "@/app/_utils/markdown/serialize/types";

const DOCUMENTS = 300;
const SEED = 20261010;

interface Failure {
  markdown: string;
  problem: string;
}

const withoutTrailingEmpty = (json: NodeJson) => {
  const content = [...(json.content ?? [])];
  while (content.length && JSON.stringify(content[content.length - 1]) === '{"type":"paragraph"}') content.pop();
  return JSON.stringify(content);
};

const check = (markdown: string): Failure | null => {
  const loaded = open(markdown);
  if (!loaded.snapshot.legacyHtml && unchangedSave(markdown) !== markdown) {
    return { markdown, problem: "unchanged save differs" };
  }
  const fresh = freshSave(markdown);
  const again = freshSave(fresh);
  if (again !== fresh) return { markdown, problem: `drifts: ${JSON.stringify(fresh)} -> ${JSON.stringify(again)}` };
  if (withoutTrailingEmpty(open(fresh).json) !== withoutTrailingEmpty(loaded.json)) {
    return { markdown, problem: `reload differs: ${JSON.stringify(fresh)}` };
  }
  return null;
};

describe("generated documents", () => {
  it(`keep bytes, never drift and reload identically apart from trailing empty paragraphs across ${DOCUMENTS} seeded documents`, () => {
    const random = seeded(SEED);
    const failures: Failure[] = [];
    for (let index = 0; index < DOCUMENTS; index++) {
      const failure = check(randomDocument(random));
      if (failure) failures.push(failure);
    }
    expect(failures.slice(0, 5)).toEqual([]);
  });
});
