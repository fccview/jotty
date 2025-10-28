import { useState, useCallback } from "react";

export const useTableToolbar = () => {
  const [showToolbar, setShowToolbar] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const handleTableSelect = useCallback((positionData: any) => {
    setPosition({ x: positionData.x, y: positionData.y });
    setTargetElement(positionData.element);
    setShowToolbar(true);
  }, []);

  const closeToolbar = useCallback(() => {
    setShowToolbar(false);
  }, []);

  return {
    showToolbar,
    position,
    targetElement,
    handleTableSelect,
    closeToolbar,
  };
};
