"use client";

import { useMemo, useEffect, useState } from "react";
import { List } from "lucide-react";
import { cn } from "@/app/_utils/global-utils";

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
  className?: string;
}

const useTableOfContents = (content: string) => {
  const [activeHeading, setActiveHeading] = useState<string | null>(null);

  const headings = useMemo(() => {
    if (!content?.trim()) return [];
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const extractedHeadings: Heading[] = [];
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-");
      extractedHeadings.push({ id, text, level });
    }
    return extractedHeadings;
  }, [content]);

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
  className,
}: TableOfContentsProps) => {
  const { headings, activeHeading, setActiveHeading } =
    useTableOfContents(content);

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveHeading(id);
    }
  };

  const renderContent = () => {
    if (headings.length === 0) {
      return <p className="text-sm text-muted-foreground">No headings found</p>;
    }
    return (
      <nav className="flex-1">
        {headings.map((heading) => (
          <button
            key={heading.id}
            onClick={() => scrollToHeading(heading.id)}
            className={cn(
              "block w-full text-left text-sm py-1 hover:text-foreground transition-colors focus:outline-none",
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
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <List className="h-4 w-4" />
          Contents
        </h3>
      </div>
      <div className="p-3 flex-1 flex flex-col overflow-y-auto hide-scrollbar max-h-[calc(100vh-200px)]">
        {renderContent()}
      </div>
    </aside>
  );
};
