import { MouseEvent, useCallback } from "react";
import { INTERACTIVE_SELECTOR } from "@/app/_consts/dnd";

const CARD_SKIP_SELECTOR = `${INTERACTIVE_SELECTOR}, label, summary, [role='button'], [role='checkbox']`;

const isSkipTarget = (target: EventTarget) =>
  target instanceof Element && target.closest(CARD_SKIP_SELECTOR) !== null;

const isSelectingText = () => (window.getSelection()?.toString().length ?? 0) > 0;

export const useCardClick = <T>(item: T, onSelect: (item: T) => void) =>
  useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (event.defaultPrevented || isSkipTarget(event.target) || isSelectingText()) return;
      onSelect(item);
    },
    [item, onSelect],
  );
