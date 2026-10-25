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

const COMMENT = /(<!--[\s\S]*?-->)/;
const STRAY_CLOSER = /--(!?)>/g;
const LONE_ANGLE = /<(?![a-zA-Z/!?])/g;

export const mendSource = (source: string) =>
  source
    .split(COMMENT)
    .map((part, index) =>
      index % 2 ? part : part.replace(STRAY_CLOSER, "--$1&gt;").replace(LONE_ANGLE, "&lt;"),
    )
    .join("");

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
