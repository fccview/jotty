import type { DomKit } from "@/app/_utils/markdown/dom-kit";

export type DomHook = (doc: Document) => void;

export const hookKit = (kit: DomKit, hooks: DomHook[]): DomKit => ({
  ...kit,
  parser: {
    parseFromString: (source, type) => {
      const parsed = kit.parser.parseFromString(source, type);
      hooks.forEach((hook) => hook(parsed));
      return parsed;
    },
  },
});
