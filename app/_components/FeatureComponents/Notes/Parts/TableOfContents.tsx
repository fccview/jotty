"use client";

import { useEffect, useState, useMemo } from "react";
import { LeftToRightListBulletIcon } from "hugeicons-react";
import { cn } from "@/app/_utils/global-utils";
import { extractHeadings as extractHeadingsFromMarkdown } from "@/app/_utils/markdown-utils";
import { useTranslations } from "next-intl";

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content?: string;
  isEditing?: boolean;
  className?: string;
}

const useTableOfContents = (content?: string, isEditing?: boolean) => {
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const [headings, setHeadings] = useState<Heading[]>([]);

  const markdownHeadings = useMemo(() => {
    if (isEditing && content) {
      return extractHeadingsFromMarkdown(content);
    }
    return [];
  }, [content, isEditing]);

  useEffect(() => {
    if (isEditing) {
      setHeadings(markdownHeadings);
      return;
    }

    const extractHeadingsFromDOM = (): Heading[] => {
      const contentArea = document.querySelector(".prose, [class*='prose']");
      const searchRoot = contentArea || document.body;
      const headingElements = searchRoot.querySelectorAll("h1, h2, h3, h4, h5, h6");
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
      const extracted = extractHeadingsFromDOM();
      setHeadings(extracted);
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
  }, [isEditing, markdownHeadings]);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
            return;
          }
        }
      },
      { rootMargin: "-85px 0px -70% 0px" }
    );

    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter(Boolean);
    elements.forEach((el) => observer.observe(el!));

    return () => observer.disconnect();
  }, [headings]);

  return { headings, activeHeading, setActiveHeading };
};

export const TableOfContents = ({
  content,
  isEditing,
  className,
}: TableOfContentsProps) => {
  const { headings, activeHeading, setActiveHeading } = useTableOfContents(content, isEditing);
  const t = useTranslations();

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveHeading(id);
    }
  };

  const renderContent = () => {
    if (headings.length === 0) {
      return <p className="text-md lg:text-sm text-muted-foreground">{t("notes.noHeadingsFound")}</p>;
    }
    return (
      <nav className="flex-1">
        {headings.map((heading) => (
          <button
            key={heading.id}
            onClick={() => scrollToHeading(heading.id)}
            className={cn(
              "block w-full text-left text-md lg:text-sm py-1 hover:text-foreground transition-colors focus:outline-none",
              activeHeading === heading.id
                ? "text-primary font-medium"
                : "text-muted-foreground"
            )}
            style={{ paddingLeft: `${(heading.level - 1) * 16}px` }}
          >
            {heading.text}
          </button>
        ))}
      </nav>
    );
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex w-64 bg-background border-border flex-col sticky top-[77px]",
        className
      )}
    >
      <div className="p-3 border-b border-border">
        <h3 className="text-md lg:text-sm font-medium text-foreground flex items-center gap-2">
          <LeftToRightListBulletIcon className="h-4 w-4" />
          {t("notes.contents")}
        </h3>
      </div>
      <div className="p-3 flex-1 flex flex-col overflow-y-auto hide-scrollbar max-h-[calc(100vh-200px)]">
        {renderContent()}
      </div>
    </aside>
  );
};
