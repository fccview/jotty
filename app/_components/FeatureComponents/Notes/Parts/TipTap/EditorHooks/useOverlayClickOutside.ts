import { useEffect } from "react";

interface UseOverlayClickOutsideProps {
  isActive: boolean;
  onClose: () => void;
}

export const useOverlayClickOutside = ({
  isActive,
  onClose,
}: UseOverlayClickOutsideProps) => {
  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (target.closest("[data-overlay]")) {
        return;
      }

      if (target.tagName === "INPUT" || target.tagName === "BUTTON") {
        return;
      }

      onClose();
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isActive, onClose]);
};
