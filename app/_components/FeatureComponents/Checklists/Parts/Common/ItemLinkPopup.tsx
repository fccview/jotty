"use client";

import { AtMentionsList } from "@/app/_components/FeatureComponents/Notes/Parts/TipTap/CustomExtensions/AtMentionsList";
import type { ItemLinkSuggestions } from "@/app/_hooks/useItemLinkSuggestions";

export const ItemLinkPopup = ({ suggestions }: { suggestions: ItemLinkSuggestions }) => {
  if (!suggestions.open) return null;

  return (
    <div
      ref={suggestions.wrapperRef}
      style={{ position: "fixed", top: suggestions.position.top, left: suggestions.position.left }}
      className="z-[9999]"
    >
      <AtMentionsList
        ref={suggestions.listRef}
        items={suggestions.items}
        command={(item) => suggestions.pick(item as (typeof suggestions.items)[number])}
      />
    </div>
  );
};
