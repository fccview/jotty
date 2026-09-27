export enum MenuSide {
  Down = "down",
  Up = "up",
}

export enum MenuAlign {
  Start = "start",
  End = "end",
}

export interface MenuPlacement {
  side: MenuSide;
  align: MenuAlign;
}

export interface MenuBox {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface MenuSize {
  width: number;
  height: number;
}

const HEADER_ATTR = "data-menu-ceiling";
export const menuCeilingProps = { [HEADER_ATTR]: "" };
const MENU_GAP = 4;

const CLIPPING = new Set(["hidden", "clip", "auto", "scroll"]);
const STUCK = new Set(["fixed", "sticky"]);

const pick = <T>(
  preferred: T,
  other: T,
  room: (choice: T) => number,
  needed: number,
): T => {
  if (room(preferred) >= needed) return preferred;
  if (room(other) >= needed) return other;
  return room(other) > room(preferred) ? other : preferred;
};

export const placeMenu = (
  anchor: MenuBox,
  menu: MenuSize,
  bounds: MenuBox,
  preferred: MenuPlacement,
): MenuPlacement => {
  const sideRoom = (side: MenuSide) =>
    side === MenuSide.Down
      ? bounds.bottom - anchor.bottom - MENU_GAP
      : anchor.top - bounds.top - MENU_GAP;
  const alignRoom = (align: MenuAlign) =>
    align === MenuAlign.Start
      ? bounds.right - anchor.left
      : anchor.right - bounds.left;

  const flipSide =
    preferred.side === MenuSide.Down ? MenuSide.Up : MenuSide.Down;
  const flipAlign =
    preferred.align === MenuAlign.Start ? MenuAlign.End : MenuAlign.Start;

  return {
    side: pick(preferred.side, flipSide, sideRoom, menu.height),
    align: pick(preferred.align, flipAlign, alignRoom, menu.width),
  };
};

const viewportBox = (): MenuBox => {
  const vv = window.visualViewport;
  if (!vv) {
    return {
      top: 0,
      left: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };
  }
  return {
    top: vv.offsetTop,
    left: vv.offsetLeft,
    right: vv.offsetLeft + vv.width,
    bottom: vv.offsetTop + vv.height,
  };
};

const clipToAncestors = (anchor: HTMLElement, box: MenuBox): MenuBox => {
  const clipped = { ...box };
  let node = anchor.parentElement;

  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const clipsX = CLIPPING.has(style.overflowX);
    const clipsY = CLIPPING.has(style.overflowY);

    if (clipsX || clipsY) {
      const rect = node.getBoundingClientRect();
      if (clipsX) {
        clipped.left = Math.max(clipped.left, rect.left);
        clipped.right = Math.min(clipped.right, rect.right);
      }
      if (clipsY) {
        clipped.top = Math.max(clipped.top, rect.top);
        clipped.bottom = Math.min(clipped.bottom, rect.bottom);
      }
    }
    node = node.parentElement;
  }

  return clipped;
};

const belowHeaders = (anchor: HTMLElement, box: MenuBox): MenuBox => {
  const anchorTop = anchor.getBoundingClientRect().top;
  let top = box.top;

  document.querySelectorAll<HTMLElement>(`[${HEADER_ATTR}]`).forEach((el) => {
    if (el.contains(anchor)) return;
    if (!STUCK.has(window.getComputedStyle(el).position)) return;
    const rect = el.getBoundingClientRect();
    if (rect.height > 0 && rect.bottom <= anchorTop) {
      top = Math.max(top, rect.bottom);
    }
  });

  return { ...box, top };
};

export const menuBounds = (anchor: HTMLElement): MenuBox =>
  belowHeaders(anchor, clipToAncestors(anchor, viewportBox()));

export const menuPlacementClasses = ({ side, align }: MenuPlacement) =>
  [
    side === MenuSide.Up ? "bottom-full mb-1" : "top-full mt-1",
    align === MenuAlign.End ? "right-0" : "left-0",
  ].join(" ");
