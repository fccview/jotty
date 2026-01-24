"use client";

import { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { TagHoverCard } from "@/app/_components/FeatureComponents/Tags/TagHoverCard";
import { Note } from "@/app/_types";
import { normalizeTag, tagMatchesFilter } from "@/app/_utils/tag-utils";

interface TagLinkComponentProps {
  node: {
    attrs: {
      tag: string;
    };
  };
}

export const TagLinkComponent = ({ node }: TagLinkComponentProps) => {
  const { tag } = node.attrs;
  const [showPopup, setShowPopup] = useState(false);
  const { notes, tagsIndex, setSelectedFilter } = useAppMode();

  const normalizedTag = normalizeTag(tag);
  const tagInfo = tagsIndex[normalizedTag];

  const notesWithTag = tagInfo
    ? (notes.filter((n) =>
      n.tags?.some((t) => tagMatchesFilter(t, normalizedTag))
    ) as Note[])
    : [];

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFilter({ type: "tag", value: normalizedTag });
  };

  return (
    <NodeViewWrapper
      as="span"
      onClick={handleClick}
      onMouseEnter={() => setShowPopup(true)}
      onMouseLeave={() => setShowPopup(false)}
      className="relative cursor-pointer"
    >
      {showPopup && notesWithTag.length > 0 && (
        <span
          className="block absolute top-full left-0 pt-1 z-10"
          onMouseEnter={() => setShowPopup(true)}
          onMouseLeave={() => setShowPopup(false)}
        >
          <TagHoverCard notes={notesWithTag} />
        </span>
      )}
      <span data-tag={tag}>#{tag}</span>
    </NodeViewWrapper>
  );
};

interface TagLinkViewComponentProps {
  tag: string;
}

export const TagLinkViewComponent = ({ tag }: TagLinkViewComponentProps) => {
  const [showPopup, setShowPopup] = useState(false);
  const { notes, tagsIndex, setSelectedFilter } = useAppMode();

  const normalizedTag = normalizeTag(tag);
  const tagInfo = tagsIndex[normalizedTag];

  const notesWithTag = tagInfo
    ? (notes.filter((n) =>
      n.tags?.some((t) => tagMatchesFilter(t, normalizedTag))
    ) as Note[])
    : [];

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFilter({ type: "tag", value: normalizedTag });
  };

  return (
    <span
      onClick={handleClick}
      onMouseEnter={() => setShowPopup(true)}
      onMouseLeave={() => setShowPopup(false)}
      className="relative cursor-pointer"
    >
      {showPopup && notesWithTag.length > 0 && (
        <span
          className="block absolute top-full left-0 pt-1 z-10"
          onMouseEnter={() => setShowPopup(true)}
          onMouseLeave={() => setShowPopup(false)}
        >
          <TagHoverCard notes={notesWithTag} />
        </span>
      )}
      <span data-tag={tag}>#{tag}</span>
    </span>
  );
};
