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
    const style = positionData.element.getAttribute("style") || "";
    const widthMatch = style.match(/width:\s*(\d+)px/);
    const heightMatch = style.match(/height:\s*(\d+)px/);

    const attrWidth = positionData.element.getAttribute("width");
    const attrHeight = positionData.element.getAttribute("height");

    setImageAttrs({
      src: positionData.element.getAttribute("src") || undefined,
      width: attrWidth
        ? parseInt(attrWidth)
        : widthMatch
          ? parseInt(widthMatch[1])
          : undefined,
      height: attrHeight
        ? parseInt(attrHeight)
        : heightMatch
          ? parseInt(heightMatch[1])
          : undefined,
    });
    setTargetElement(positionData.element);
    setShowOverlay(true);
  }, []);

  const updateImageAttrs = useCallback(
    (
      width: number | null,
      height: number | null,
      finalUpdate: boolean = false,
      previewOnly: boolean = false
    ) => {
      if (!editor || !imageAttrs.src || !targetElement) {
        if (finalUpdate) setShowOverlay(false);
        return;
      }

      let style = targetElement.getAttribute("style") || "";
      style = style
        .replace(/width:\s*[^;]+;?/g, "")
        .replace(/height:\s*[^;]+;?/g, "")
        .trim();

      let newHeightStyle = "";
      let newWidthStyle = "";

      if (height !== null && height > 0) {
        newHeightStyle = `height: ${height}px;`;
        imageAttrs.height = height;
      } else {
        newHeightStyle = ""
        imageAttrs.height = undefined;
      }

      if (width !== null && width > 0) {
        newWidthStyle = `width: ${width}px;`;
        imageAttrs.width = width;
      } else {
        newWidthStyle = ""
        imageAttrs.width = undefined;
      }

      style = `${style}${style ? " " : ""}${newWidthStyle}${newHeightStyle}`;

      targetElement.setAttribute("style", style);

      if (previewOnly) {
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
          newAttrs.style = style || "";
          newAttrs.width = width;
          newAttrs.height = height;

          const tr = state.tr.setNodeMarkup(imagePos, undefined, newAttrs);
          view.dispatch(tr);
        }
      }

      if (finalUpdate) setShowOverlay(false);
    },
    [editor, imageAttrs.src, targetElement]
  );

  const handleResize = useCallback(
    (width: number | null, height: number | null) => {
      updateImageAttrs(width, height, true, false);
    },
    [updateImageAttrs]
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
    updateImageAttrs,
    closeOverlay,
  };
};
