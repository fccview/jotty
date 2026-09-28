import { Extension, InputRule } from "@tiptap/core";

export const tripleStarRegex =
  /(?:^|\s)(\*\*\*(?!\s+\*\*\*)((?:[^*]+))\*\*\*(?!\s+\*\*\*))$/;

export const tripleUnderscoreRegex =
  /(?:^|\s)(___(?!\s+___)((?:[^_]+))___(?!\s+___))$/;

export const BoldItalicInput = Extension.create({
  name: "boldItalicInput",

  addInputRules() {
    const { bold, italic } = this.editor.schema.marks;
    if (!bold || !italic) return [];

    const doubleMarkRule = (find: RegExp) =>
      new InputRule({
        find,
        handler: ({ state, range, match }) => {
          const fullMatch = match[0];
          const text = match[match.length - 1];
          if (!text) return null;

          const { tr } = state;
          const startSpaces = fullMatch.search(/\S/);
          const textStart = range.from + fullMatch.indexOf(text);
          const textEnd = textStart + text.length;

          if (textEnd < range.to) tr.delete(textEnd, range.to);
          if (textStart > range.from) tr.delete(range.from + startSpaces, textStart);

          const markStart = range.from + startSpaces;
          const markEnd = markStart + text.length;

          tr.addMark(markStart, markEnd, bold.create());
          tr.addMark(markStart, markEnd, italic.create());
          tr.removeStoredMark(bold);
          tr.removeStoredMark(italic);
        },
      });

    return [
      doubleMarkRule(tripleStarRegex),
      doubleMarkRule(tripleUnderscoreRegex),
    ];
  },
});
