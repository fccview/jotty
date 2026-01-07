import { useState, useEffect, useRef, useCallback } from "react";

export const useResizing = () => {
    const [sidebarWidth, setSidebarWidth] = useState(320);
    const isResizing = useRef(false);
    const sidebarWidthRef = useRef(sidebarWidth);
    const [isLocalStorageInitialized, setIsLocalStorageInitialized] = useState(false);

    useEffect(() => {
        sidebarWidthRef.current = sidebarWidth;
    }, [sidebarWidth]);

    useEffect(() => {
        const savedWidth = localStorage.getItem("sidebar-width");
        if (savedWidth) {
            const width = parseInt(savedWidth);
            if (width >= 320 && width <= 800) setSidebarWidth(width);
        }
        setIsLocalStorageInitialized(true);
    }, []);

    useEffect(() => {
        if (isLocalStorageInitialized && !isResizing.current) {
            localStorage.setItem("sidebar-width", sidebarWidth.toString());
        }
    }, [sidebarWidth, isLocalStorageInitialized]);

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing.current = true;
        const startX = e.clientX;
        const startWidth = sidebarWidthRef.current;
        const doDrag = (e: MouseEvent) => {
            const newWidth = Math.max(
                320,
                Math.min(800, startWidth + e.clientX - startX)
            );
            setSidebarWidth(newWidth);
        };
        const stopDrag = () => {
            isResizing.current = false;
            document.removeEventListener("mousemove", doDrag);
            document.removeEventListener("mouseup", stopDrag);
            localStorage.setItem("sidebar-width", sidebarWidthRef.current.toString());
        };
        document.addEventListener("mousemove", doDrag);
        document.addEventListener("mouseup", stopDrag);
    }, []);

    return {
        sidebarWidth,
        isResizing: isResizing.current,
        startResizing,
    };
};
