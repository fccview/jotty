import { ReactRenderer } from "@tiptap/react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import tippy, { type Instance } from "tippy.js";
import type { ComponentType } from "react";

const ESCAPE_KEY = "Escape";

interface KeyHandler {
  onKeyDown?: (event: KeyboardEvent) => boolean;
}

const placeAnchor = (anchor: HTMLElement, rect: DOMRect | null | undefined) => {
  if (!rect) return;
  anchor.style.left = `${rect.left}px`;
  anchor.style.top = `${rect.top}px`;
};

const createAnchor = () => {
  const anchor = document.createElement("div");
  anchor.style.position = "absolute";
  anchor.style.pointerEvents = "none";
  anchor.style.zIndex = "10";
  document.body.appendChild(anchor);
  return anchor;
};

export const suggestionPopup =
  <P extends object>(component: ComponentType<P>) =>
  () => {
    let renderer: ReactRenderer | null = null;
    let popup: Instance | null = null;
    let anchor: HTMLElement | null = null;

    const teardown = () => {
      popup?.destroy();
      anchor?.remove();
      renderer?.destroy();
      popup = null;
      anchor = null;
      renderer = null;
    };

    return {
      onStart: (props: SuggestionProps) => {
        teardown();
        renderer = new ReactRenderer(component, { props, editor: props.editor });
        if (!props.clientRect) return;
        anchor = createAnchor();
        placeAnchor(anchor, props.clientRect());
        popup = tippy(anchor, {
          content: renderer.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
          theme: "light",
          maxWidth: "none",
          appendTo: () => document.body,
        });
      },

      onUpdate: (props: SuggestionProps) => {
        renderer?.updateProps(props);
        if (anchor && props.clientRect) placeAnchor(anchor, props.clientRect());
      },

      onKeyDown: (props: SuggestionKeyDownProps) => {
        if (props.event.key === ESCAPE_KEY) {
          popup?.hide();
          return true;
        }
        return (renderer?.ref as KeyHandler | null)?.onKeyDown?.(props.event) ?? false;
      },

      onExit: teardown,
    };
  };
