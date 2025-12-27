import { useState, useEffect, useRef, useCallback } from "react";

export const useSettingsSidebar = () => {
    const [sidebarWidth, setSidebarWidth] = useState(280);
    const isResizing = useRef(false);
    const sidebarWidthRef = useRef(sidebarWidth);

    useEffect(() => {
        sidebarWidthRef.current = sidebarWidth;
    }, [sidebarWidth]);

    useEffect(() => {
        const savedWidth = localStorage.getItem("settings-sidebar-width");
        if (savedWidth) {
            const width = parseInt(savedWidth);
            if (width >= 280 && width <= 600) setSidebarWidth(width);
        }
    }, []);

    useEffect(() => {
        if (!isResizing.current) {
            localStorage.setItem("settings-sidebar-width", sidebarWidth.toString());
        }
    }, [sidebarWidth]);

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing.current = true;
        const startX = e.clientX;
        const startWidth = sidebarWidthRef.current;
        const doDrag = (e: MouseEvent) => {
            const newWidth = Math.max(
                280,
                Math.min(600, startWidth + e.clientX - startX)
            );
            setSidebarWidth(newWidth);
        };
        const stopDrag = () => {
            isResizing.current = false;
            document.removeEventListener("mousemove", doDrag);
            document.removeEventListener("mouseup", stopDrag);
            localStorage.setItem("settings-sidebar-width", sidebarWidthRef.current.toString());
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
