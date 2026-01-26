import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface OverlayPosition {
  x: number;
  y: number;
  element: HTMLElement;
}

export interface OverlayExtensionOptions {
  onImageClick?: (position: OverlayPosition) => void;
  onTableSelect?: (position: OverlayPosition) => void;
}

export const OverlayExtension = Extension.create<OverlayExtensionOptions>({
  name: "overlayExtension",

  addOptions() {
    return {
      onImageClick: () => { },
      onTableSelect: () => { },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("overlayExtension"),
        props: {
          handleDOMEvents: {
            click: (view, event) => {
              const target = event.target as HTMLElement;

              if (target.tagName === "IMG") {
                const rect = target.getBoundingClientRect();
                this.options.onImageClick?.({
                  x: rect.left + rect.width / 2,
                  y: rect.top,
                  element: target,
                });
                event.preventDefault();
                event.stopPropagation();
                return true;
              }

              if (
                target.closest("table") ||
                target.closest("td") ||
                target.closest("th")
              ) {
                const cellElement = (target.closest("td") ||
                  target.closest("th")) as HTMLElement;
                if (cellElement) {
                  const rect = cellElement.getBoundingClientRect();
                  this.options.onTableSelect?.({
                    x: rect.left,
                    y: rect.top - 10,
                    element: cellElement,
                  });
                }
                return false;
              }

              return false;
            },
          },
        },
      }),
    ];
  },
});
