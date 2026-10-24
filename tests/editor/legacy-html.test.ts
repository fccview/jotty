// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { editAndSave, freshSave, open, unchangedSave } from "./harness";
import { blockTypes, expectRoundtrip, findOne, textOf } from "./properties";

const ISSUE_145 = "<h1>Title</h1><ul><li><p>a</p></li></ul><p>text</p>";
const ENCRYPTED_BODY = "<p>Secret <strong>plan</strong></p><blockquote><p>quoted</p></blockquote><pre><code>x = 1</code></pre>";

describe("legacy editor html documents", () => {
  it("loads the #145 html note as heading, list and paragraph", () => {
    const { json, snapshot } = open(ISSUE_145);
    expect(blockTypes(json)).toEqual(["heading", "bulletList", "paragraph"]);
    expect(textOf(findOne(json, "heading"))).toBe("Title");
    expect(textOf(findOne(json, "bulletList"))).toBe("a");
    expect(snapshot.segments).toEqual([]);
  });

  it("writes markdown on the first save of a legacy html note", () => {
    const fresh = freshSave(ISSUE_145);
    expect(fresh).toBe("# Title\n\n- a\n\ntext");
    expect(freshSave(fresh)).toBe(fresh);
    expect(open(fresh).json).toEqual(open(ISSUE_145).json);
  });

  it("writes markdown for a decrypted editor html body", () => {
    const fresh = freshSave(ENCRYPTED_BODY);
    expect(fresh).toBe("Secret **plan**\n\n> quoted\n\n```\nx = 1\n```");
    expect(open(fresh).json).toEqual(open(ENCRYPTED_BODY).json);
  });

  it("writes markdown when a legacy html note is edited", () => {
    const saved = editAndSave(ISSUE_145, (editor) => {
      editor.commands.setTextSelection(1);
      editor.commands.insertContent("My ");
    });
    expect(saved).toBe("# My Title\n\n- a\n\ntext");
  });

  it.each([
    ["pre block", "<pre>preformatted\n  text</pre>", "```\npreformatted\n  text\n```"],
  ])("reads a note that is only an html %s as legacy editor html", (_name, markdown, fresh) => {
    expect(open(markdown).snapshot.segments).toEqual([]);
    expect(freshSave(markdown)).toBe(fresh);
  });

  it("reads a legacy html note whose code block has blank lines", () => {
    const markdown = "<p>intro</p><pre><code>x = 1\n\ny = 2</code></pre><p>outro</p>";
    const { json, snapshot } = open(markdown);
    expect(snapshot.legacyHtml).toBe(true);
    expect(blockTypes(json)).toEqual(["paragraph", "codeBlock", "paragraph"]);
    expect(freshSave(markdown)).toBe("intro\n\n```\nx = 1\n\ny = 2\n```\n\noutro");
  });

  it("writes nothing when every block of a legacy html note is deleted", () => {
    const saved = editAndSave(ISSUE_145, (editor) => {
      editor.commands.clearContent();
    });
    expect(saved).toBe("");
  });

  it.each([
    ["details", "<details>\n<summary>Click</summary>\n\nHidden **text**\n\n</details>"],
    ["table", "<table>\n  <tbody>\n    <tr>\n      <td>a</td>\n    </tr>\n  </tbody>\n</table>"],
    ["image", '<img src="/api/image/u/p.png" alt="p" style="width: 200px; height: 100px" />'],
    ["diagram", "<!-- drawio-diagram\ndata: PG14Pg==\nsvg: PHN2Zz48L3N2Zz4=\ntheme: light\n-->"],
    ["html then markdown", "<p>intro</p>\n\n# Markdown heading"],
    ["paragraph with attributes the editor never wrote", '<p align="center">centered</p>'],
    ["html blocks separated by blank lines", '<p align="center">centred</p>\n\n<div>raw block</div>'],
  ])("keeps segment preservation for a note starting with %s", (_name, markdown) => {
    expect(open(markdown).snapshot.segments.length).toBeGreaterThan(0);
    expect(unchangedSave(markdown)).toBe(markdown);
    expectRoundtrip(markdown);
  });
});
