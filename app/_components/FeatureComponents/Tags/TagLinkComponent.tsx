"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
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
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef<HTMLElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { notes, checklists, tagsIndex } = useAppMode();

  const normalizedTag = normalizeTag(tag);
  const tagInfo = tagsIndex[normalizedTag];

  const notesWithTag = tagInfo
    ? (notes.filter((n) =>
        n.tags?.some((t) => tagMatchesFilter(t, normalizedTag)),
      ) as Note[])
    : [];

  const checklistsWithTag = tagInfo
    ? checklists.filter((c) =>
        c.tags?.some((t) => tagMatchesFilter(t, normalizedTag)),
      )
    : [];

  const hasItems = notesWithTag.length > 0 || checklistsWithTag.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/?mode=tags&tag=${encodeURIComponent(normalizedTag)}`);
  };

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setPopupPos({ top: rect.bottom + 4, left: rect.left });
    }
    setShowPopup(true);
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => setShowPopup(false), 150);
  };

  const handlePopupMouseEnter = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  };

  const handlePopupMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => setShowPopup(false), 150);
  };

  const popupEl =
    showPopup && hasItems ? (
      <span
        style={{ position: "fixed", top: popupPos.top, left: popupPos.left }}
        className="z-[9999]"
        onMouseEnter={handlePopupMouseEnter}
        onMouseLeave={handlePopupMouseLeave}
      >
        <TagHoverCard notes={notesWithTag} checklists={checklistsWithTag} />
      </span>
    ) : null;

  return (
    <NodeViewWrapper
      as="span"
      ref={wrapperRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="cursor-pointer"
    >
      {typeof document !== "undefined" && popupEl
        ? createPortal(popupEl, document.body)
        : null}
      <span
        data-tag={tag}
        className="text-primary underline underline-offset-2 hover:no-underline"
      >
        #{tag}
      </span>
    </NodeViewWrapper>
  );
};

interface TagLinkViewComponentProps {
  tag: string;
}

export const TagLinkViewComponent = ({ tag }: TagLinkViewComponentProps) => {
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { notes, checklists, tagsIndex } = useAppMode();

  const normalizedTag = normalizeTag(tag);
  const tagInfo = tagsIndex[normalizedTag];

  const notesWithTag = tagInfo
    ? (notes.filter((n) =>
        n.tags?.some((t) => tagMatchesFilter(t, normalizedTag)),
      ) as Note[])
    : [];

  const checklistsWithTag = tagInfo
    ? checklists.filter((c) =>
        c.tags?.some((t) => tagMatchesFilter(t, normalizedTag)),
      )
    : [];

  const hasItems = notesWithTag.length > 0 || checklistsWithTag.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/?mode=tags&tag=${encodeURIComponent(normalizedTag)}`);
  };

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setPopupPos({ top: rect.bottom + 4, left: rect.left });
    }
    setShowPopup(true);
  };

  const handleMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => setShowPopup(false), 150);
  };

  const handlePopupMouseEnter = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
  };

  const handlePopupMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => setShowPopup(false), 150);
  };

  const popupEl =
    showPopup && hasItems ? (
      <span
        style={{ position: "fixed", top: popupPos.top, left: popupPos.left }}
        className="z-[9999]"
        onMouseEnter={handlePopupMouseEnter}
        onMouseLeave={handlePopupMouseLeave}
      >
        <TagHoverCard notes={notesWithTag} checklists={checklistsWithTag} />
      </span>
    ) : null;

  return (
    <span
      ref={wrapperRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="cursor-pointer"
    >
      {typeof document !== "undefined" && popupEl
        ? createPortal(popupEl, document.body)
        : null}
      <span
        data-tag={tag}
        className="text-primary underline underline-offset-2 hover:no-underline"
      >
        #{tag}
      </span>
    </span>
  );
};
