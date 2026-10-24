"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/app/_utils/global-utils";
import { extractHeadings as extractHeadingsFromMarkdown } from "@/app/_utils/markdown-utils";
import { useTranslations } from "next-intl";
import { PanelEmpty } from "@/app/_components/FeatureComponents/Notes/Parts/NotePanel/PanelEmpty";

const HEADINGS = "h1, h2, h3, h4, h5, h6";
const LINK_PREVIEW = "[data-link-preview]";
const SCROLL_ROOT = ".jotty-scrollable-content";
const ACTIVE_OFFSET = 24;
const USER_SCROLL_EVENTS = ["wheel", "touchstart", "keydown"] as const;
const SETTLE_MS = 150;

const ownHeadings = (root: ParentNode): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(HEADINGS)).filter(
    (heading) => !heading.closest(LINK_PREVIEW),
  );

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface Pin {
  id: string;
  top: number | null;
}

interface TableOfContentsProps {
  content?: string;
  isEditing?: boolean;
}

const sameHeadings = (a: Heading[], b: Heading[]) =>
  a.length === b.length &&
  a.every((heading, index) =>
    heading.id === b[index].id &&
    heading.text === b[index].text &&
    heading.level === b[index].level,
  );

const findHeadingEl =(id: string, text: string): HTMLElement | null => {
  const byId = document.getElementById(id);
  if (byId && !byId.closest(LINK_PREVIEW)) return byId;
  return ownHeadings(document).find((h) => h.textContent?.trim() === text) ?? null;
};

const useTableOfContents = (content?: string, isEditing?: boolean) => {
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const [domHeadings, setDomHeadings] = useState<Heading[]>([]);
  const pinned = useRef<Pin | null>(null);
  const settle = useRef(() => {});

  const markdownHeadings = useMemo(
    () => (isEditing && content ? extractHeadingsFromMarkdown(content) : []),
    [content, isEditing],
  );

  const headings = isEditing ? markdownHeadings : domHeadings;

  useEffect(() => {
    if (isEditing) return;

    const extractHeadingsFromDOM = (): Heading[] => {
      const contentArea = document.querySelector(".prose, [class*='prose']");
      const searchRoot = contentArea || document.body;
      const headingElements = ownHeadings(searchRoot);
      const extracted: Heading[] = [];

      headingElements.forEach((element) => {
        const id = element.id;
        const text = element.textContent || "";
        const tagName = element.tagName.toLowerCase();
        const level = parseInt(tagName.charAt(1));

        if (id && text.trim()) {
          extracted.push({ id, text: text.trim(), level });
        }
      });

      return extracted;
    };

    const updateHeadings = () => {
      const next = extractHeadingsFromDOM();
      setDomHeadings((current) => (sameHeadings(current, next) ? current : next));
    };

    const timeoutId = setTimeout(updateHeadings, 100);

    const observer = new MutationObserver(() => {
      updateHeadings();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [isEditing]);

  useEffect(() => {
    if (headings.length === 0) return;

    let detach = () => {};
    const timeoutId = setTimeout(() => {
      const targets = headings
        .map((heading) => ({ id: heading.id, el: findHeadingEl(heading.id, heading.text) }))
        .filter((target): target is { id: string; el: HTMLElement } => Boolean(target.el));
      const container = targets[0]?.el.closest(SCROLL_ROOT);
      if (!container) return;

      let frame = 0;
      let settling: ReturnType<typeof setTimeout> | undefined;
      settle.current = () => {
        clearTimeout(settling);
        settling = setTimeout(() => {
          if (pinned.current) pinned.current.top = container.scrollTop;
        }, SETTLE_MS);
      };
      const update = () => {
        frame = 0;
        if (pinned.current) return;
        const line = container.getBoundingClientRect().top + ACTIVE_OFFSET;
        const passed = targets.filter(({ el }) => el.getBoundingClientRect().top <= line);
        setActiveHeading(passed.length ? passed[passed.length - 1].id : null);
      };
      const onScroll = () => {
        const held = pinned.current;
        if (held?.top != null && Math.abs(container.scrollTop - held.top) > 1) pinned.current = null;
        else if (held) settle.current();
        if (!frame) frame = requestAnimationFrame(update);
      };
      const unpin = () => {
        pinned.current = null;
      };

      container.addEventListener("scroll", onScroll, { passive: true });
      USER_SCROLL_EVENTS.forEach((type) => container.addEventListener(type, unpin, { passive: true }));
      update();

      detach = () => {
        cancelAnimationFrame(frame);
        clearTimeout(settling);
        settle.current = () => {};
        container.removeEventListener("scroll", onScroll);
        USER_SCROLL_EVENTS.forEach((type) => container.removeEventListener(type, unpin));
      };
    }, isEditing ? 300 : 0);

    return () => {
      clearTimeout(timeoutId);
      detach();
    };
  }, [headings, isEditing]);

  const pin = (id: string) => {
    pinned.current = { id, top: null };
    settle.current();
    setActiveHeading(id);
  };

  return { headings, activeHeading, pin };
};

export const TableOfContents = ({ content, isEditing }: TableOfContentsProps) => {
  const { headings, activeHeading, pin } = useTableOfContents(content, isEditing);
  const t = useTranslations();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!activeHeading) return;
    const button = navRef.current?.querySelector<HTMLElement>(`[data-heading="${CSS.escape(activeHeading)}"]`);
    button?.scrollIntoView({ block: "nearest" });
  }, [activeHeading]);

  const scrollToHeading = (id: string, text: string) => {
    const element = findHeadingEl(id, text);
    if (!element) return;

    const scrollContainer = element.closest(SCROLL_ROOT);
    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const offset = elementRect.top - containerRect.top + scrollContainer.scrollTop;
      scrollContainer.scrollTo({ top: offset, behavior: "smooth" });
    } else {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    pin(id);
  };

  if (headings.length === 0) return <PanelEmpty>{t("notes.noHeadingsFound")}</PanelEmpty>;

  const topLevel = Math.min(...headings.map((heading) => heading.level));

  return (
    <nav ref={navRef} className="mx-2 my-1 flex flex-col border-l border-border">
      {headings.map((heading) => (
        <button
          key={heading.id}
          type="button"
          data-heading={heading.id}
          title={heading.text}
          onClick={() => scrollToHeading(heading.id, heading.text)}
          className={cn(
            "-ml-px truncate border-l-2 py-1 pr-1 text-left text-md lg:text-sm transition-colors focus-visible:outline-none focus-visible:text-foreground",
            activeHeading === heading.id
              ? "border-primary text-foreground font-medium"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
          style={{ paddingLeft: `${0.75 + (heading.level - topLevel) * 0.75}rem` }}
        >
          {heading.text}
        </button>
      ))}
    </nav>
  );
};
