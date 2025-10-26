import { useState, useCallback } from "react";
import { Editor } from "@tiptap/react";

interface ImageAttrs {
  src?: string;
  width?: number;
  height?: number;
}

export const useImageResize = (editor: Editor | null) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageAttrs, setImageAttrs] = useState<ImageAttrs>({});
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const handleImageClick = useCallback((positionData: any) => {
    setPosition({ x: positionData.x, y: positionData.y });
    setImageAttrs({
      src: positionData.element.getAttribute("src") || undefined,
      width: positionData.element.getAttribute("width")
        ? parseInt(positionData.element.getAttribute("width")!)
        : undefined,
      height: positionData.element.getAttribute("height")
        ? parseInt(positionData.element.getAttribute("height")!)
        : undefined,
    });
    setTargetElement(positionData.element);
    setShowOverlay(true);
  }, []);

  const handleResize = useCallback(
    (width: number | null, height: number | null) => {
      if (!editor || !imageAttrs.src) {
        setShowOverlay(false);
        return;
      }

      const { state, view } = editor;
      let imagePos = -1;

      state.doc.descendants((node, pos) => {
        if (node.type.name === "image" && node.attrs.src === imageAttrs.src) {
          imagePos = pos;
          return false;
        }
      });

      if (imagePos !== -1) {
        const imageNode = state.doc.nodeAt(imagePos);
        if (imageNode) {
          const newAttrs = { ...imageNode.attrs };

          if (width !== null && width > 0) {
            newAttrs.width = width;
          } else {
            delete newAttrs.width;
          }

          if (height !== null && height > 0) {
            newAttrs.height = height;
          } else {
            delete newAttrs.height;
          }

          const tr = state.tr.setNodeMarkup(imagePos, undefined, newAttrs);
          view.dispatch(tr);
        }
      }

      setShowOverlay(false);
    },
    [editor, imageAttrs.src]
  );

  const closeOverlay = useCallback(() => {
    setShowOverlay(false);
  }, []);

  return {
    showOverlay,
    position,
    imageAttrs,
    targetElement,
    handleImageClick,
    handleResize,
    closeOverlay,
  };
};
