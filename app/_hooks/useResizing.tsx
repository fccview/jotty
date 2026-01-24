import { useCallback, useRef, useEffect } from "react";
import { useSidebarStore } from "@/app/_utils/sidebar-store";

export const useResizing = () => {
  const { sidebarWidth, setSidebarWidth } = useSidebarStore();
  const isResizing = useRef(false);
  const sidebarWidthRef = useRef(sidebarWidth);

  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  const startResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing.current = true;
      const startX = e.clientX;
      const startWidth = sidebarWidthRef.current;

      const doDrag = (e: MouseEvent) => {
        const newWidth = Math.max(320, Math.min(800, startWidth + e.clientX - startX));
        setSidebarWidth(newWidth);
      };

      const stopDrag = () => {
        isResizing.current = false;
        document.removeEventListener("mousemove", doDrag);
        document.removeEventListener("mouseup", stopDrag);
      };

      document.addEventListener("mousemove", doDrag);
      document.addEventListener("mouseup", stopDrag);
    },
    [setSidebarWidth]
  );

  return {
    sidebarWidth,
    isResizing: isResizing.current,
    startResizing,
  };
};
