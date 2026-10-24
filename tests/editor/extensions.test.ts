// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { editor, open } from "./harness";
import { expectRoundtrip, markTypes } from "./properties";

describe("editor extensions", () => {
  it("registers every extension name once", () => {
    const names = editor().extensionManager.extensions.map((extension) => extension.name);
    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
  });

  it("reads and writes underline as <u>", () => {
    const markdown = "some <u>underlined</u> words";
    expect(markTypes(open(markdown).json)).toEqual(["underline"]);
    expectRoundtrip(markdown);
  });
});
