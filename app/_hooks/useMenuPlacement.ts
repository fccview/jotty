import { RefObject, useCallback, useLayoutEffect, useState } from "react";
import {
  MenuAlign,
  MenuPlacement,
  MenuSide,
  menuBounds,
  placeMenu,
} from "@/app/_utils/menu-placement-utils";

export const useMenuPlacement = (
  isOpen: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  menuRef: RefObject<HTMLElement | null>,
  side: MenuSide = MenuSide.Down,
  align: MenuAlign = MenuAlign.Start,
): MenuPlacement => {
  const [placement, setPlacement] = useState<MenuPlacement>({ side, align });

  const measure = useCallback(() => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!anchor || !menu) return;

    const next = placeMenu(
      anchor.getBoundingClientRect(),
      { width: menu.offsetWidth, height: menu.offsetHeight },
      menuBounds(anchor),
      { side, align },
    );
    setPlacement((prev) =>
      prev.side === next.side && prev.align === next.align ? prev : next,
    );
  }, [anchorRef, menuRef, side, align]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPlacement({ side, align });
      return;
    }

    measure();

    const vv = window.visualViewport;
    window.addEventListener("resize", measure);
    vv?.addEventListener("resize", measure);

    return () => {
      window.removeEventListener("resize", measure);
      vv?.removeEventListener("resize", measure);
    };
  }, [isOpen, measure, side, align]);

  return placement;
};
