import { Window } from "happy-dom";
import type { DomKit } from "@/app/_utils/markdown/dom-kit";

export interface HappyKit {
  kit: DomKit;
  close: () => Promise<void>;
}

const QUIET_SETTINGS = {
  disableJavaScriptFileLoading: true,
  disableCSSFileLoading: true,
  disableComputedStyleRendering: true,
  navigation: {
    disableMainFrameNavigation: true,
    disableChildFrameNavigation: true,
    disableChildPageNavigation: true,
  },
};

const COMMENT_OPEN = "<!--";
const COMMENT_CLOSE = "-->";
const STRAY_CLOSER = /--(!?)>/g;
const LONE_ANGLE = /<(?![a-zA-Z/!?])/g;

const mendText = (text: string) => text.replace(STRAY_CLOSER, "--$1&gt;").replace(LONE_ANGLE, "&lt;");

export const mendSource = (source: string) => {
  const parts: string[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    const open = source.indexOf(COMMENT_OPEN, cursor);
    const close = open < 0 ? -1 : source.indexOf(COMMENT_CLOSE, open + COMMENT_OPEN.length);
    if (close < 0) break;
    const end = close + COMMENT_CLOSE.length;
    parts.push(mendText(source.slice(cursor, open)), source.slice(open, end));
    cursor = end;
  }
  parts.push(mendText(source.slice(cursor)));
  return parts.join("");
};

export const happyKit = (): HappyKit => {
  const window = new Window({ settings: QUIET_SETTINGS });
  const parser = new window.DOMParser();
  return {
    kit: {
      parser: {
        parseFromString: (source, type) =>
          parser.parseFromString(mendSource(source), type) as unknown as Document,
      },
      document: window.document as unknown as Document,
    },
    close: async () => {
      try {
        await window.happyDOM.close();
      } catch (error) {
        console.error("Failed to close happy-dom window:", error);
      }
    },
  };
};
