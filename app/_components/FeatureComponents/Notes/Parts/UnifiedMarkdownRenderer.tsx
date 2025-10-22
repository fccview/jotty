"use client";

import {
  useEffect,
  useState,
  isValidElement,
  Children,
  ReactElement,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import { CodeBlockRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/CodeBlock/CodeBlockRenderer";
import { FileAttachment } from "@/app/_components/GlobalComponents/FormElements/FileAttachment";
import type { Components } from "react-markdown";
import { QUOTES } from "@/app/_consts/notes";
import { ImageAttachment } from "@/app/_components/GlobalComponents/FormElements/ImageAttachment";
import { lowlight } from "@/app/_utils/lowlight-utils";
import { toHtml } from "hast-util-to-html";

const getRawTextFromChildren = (children: React.ReactNode): string => {
  let text = "";
  Children.forEach(children, (child) => {
    if (typeof child === "string") {
      text += child;
    } else if (isValidElement(child) && child.props.children) {
      text += getRawTextFromChildren(child.props.children);
    }
  });
  return text;
};

interface UnifiedMarkdownRendererProps {
  content: string;
  className?: string;
}

export const UnifiedMarkdownRenderer = ({
  content,
  className = "",
}: UnifiedMarkdownRendererProps) => {
  const [isClient, setIsClient] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !selectedQuote) {
      const quoteIndex = Math.floor(Math.random() * QUOTES.length);
      setSelectedQuote(QUOTES[quoteIndex]);
    }
  }, [isClient, selectedQuote]);

  if (!content?.trim()) {
    const displayQuote = selectedQuote || "Nothing... a whole lot of nothing.";

    return (
      <div
        className={`prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl dark:prose-invert ${className}`}
      >
        <div className="text-center py-12">
          <p className="text-lg italic text-muted-foreground">
            &quot;{displayQuote}&quot;
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Start writing your note above!
          </p>
        </div>
      </div>
    );
  }

  const components: Partial<Components> = {
    pre: ({ node, children, ...props }) => {
      const child = Children.toArray(children)[0];

      if (isValidElement(child) && child.type === "code") {
        const codeElement = child as ReactElement;
        const language =
          codeElement.props.className?.replace("language-", "") || "plaintext";
        const rawCode = getRawTextFromChildren(codeElement.props.children);

        let highlightedHtml: string;

        if (!lowlight.registered(language)) {
          highlightedHtml = rawCode;
        } else {
          const highlightedTree = lowlight.highlight(language, rawCode);
          highlightedHtml = toHtml(highlightedTree);
        }

        const newCodeElement = {
          ...codeElement,
          props: {
            ...codeElement.props,
            dangerouslySetInnerHTML: { __html: highlightedHtml },
            children: null,
          },
        };

        return (
          <CodeBlockRenderer code={rawCode} language={language}>
            {lowlight.registered(language) ? (newCodeElement as any) : children}
          </CodeBlockRenderer>
        );
      }
      return <pre {...props}>{children}</pre>;
    },
    abbr({ children, title, ...props }) {
      return (
        <abbr title={title} {...props}>
          {children}
        </abbr>
      );
    },
    a({ href, children, ...props }) {
      const childText = String(children);
      const isFileAttachment = childText.startsWith("📎 ") && href;

      if (isFileAttachment) {
        const fileName = childText.substring(2);
        const isImage = href.includes("/api/image/");
        const mimeType = isImage ? "image/jpeg" : "application/octet-stream";

        return isImage ? (
          <ImageAttachment url={href} fileName={fileName} className="my-4" />
        ) : (
          <FileAttachment
            url={href}
            fileName={fileName}
            mimeType={mimeType}
            className="my-4"
          />
        );
      }

      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    },
    input({ type, checked, ...props }) {
      if (type === "checkbox") {
        return (
          <input
            type="checkbox"
            checked={checked}
            disabled
            className="cursor-default"
            {...props}
          />
        );
      }
      return <input type={type} {...props} />;
    },
    ul({ node, className, children, ...props }) {
      const isTaskList = className?.includes("contains-task-list");

      if (isTaskList) {
        return (
          <ul
            className={`list-none !pl-0 space-y-1 ${className || ""}`}
            {...props}
          >
            {children}
          </ul>
        );
      }

      return (
        <ul className={className} {...props}>
          {children}
        </ul>
      );
    },
    li({ node, className, children, ...props }) {
      const isTaskItem = className?.includes("task-list-item");

      if (isTaskItem) {
        return (
          <li
            className={`flex items-center gap-1 ${className || ""}`}
            {...props}
          >
            {children}
          </li>
        );
      }

      return (
        <li className={className} {...props}>
          {children}
        </li>
      );
    },
  };

  return (
    <div
      className={`prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl dark:prose-invert [&_ul]:list-disc [&_ol]:list-decimal [&_table]:border-collapse [&_table]:w-full [&_table]:my-4 [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-muted [&_th]:font-semibold [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_tr:nth-child(even)]:bg-muted/50 ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
