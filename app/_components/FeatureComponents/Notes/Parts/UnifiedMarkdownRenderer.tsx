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
import { MermaidRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/MermaidRenderer";
import { DrawioRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/DrawioRenderer";
import { FileAttachment } from "@/app/_components/GlobalComponents/FormElements/FileAttachment";
import type { Components } from "react-markdown";
import { QUOTES } from "@/app/_consts/notes";
import { ImageAttachment } from "@/app/_components/GlobalComponents/FormElements/ImageAttachment";
import { VideoAttachment } from "@/app/_components/GlobalComponents/FormElements/VideoAttachment";
import { lowlight } from "@/app/_utils/lowlight-utils";
import { toHtml } from "hast-util-to-html";
import { InternalLink } from "./TipTap/CustomExtensions/InternalLink";
import { InternalLinkComponent } from "./TipTap/CustomExtensions/InternalLinkComponent";
import { ItemTypes } from "@/app/_types/enums";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { decodeCategoryPath, decodeId } from "@/app/_utils/global-utils";

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
  const { contentWithoutMetadata } = extractYamlMetadata(content);

  const processedContent = contentWithoutMetadata.replace(
    /<!--\s*drawio-diagram\s+data:\s*([^\n]+)\s+svg:\s*([^\n]+)\s*-->/g,
    (match, dataBase64, svgBase64) => {
      try {
        const diagramData = atob(dataBase64.trim());
        const svgData = atob(svgBase64.trim());
        return `<div data-drawio="" data-drawio-data="${diagramData.replace(/"/g, '&quot;')}" data-drawio-svg="${svgData.replace(/"/g, '&quot;')}">[Draw.io Diagram]</div>`;
      } catch (e) {
        console.error('Failed to process Draw.io comment:', e);
        return match;
      }
    }
  );

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

        if (language === "mermaid") {
          return <MermaidRenderer code={rawCode} />;
        }

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
      const isVideoAttachment = childText.startsWith("🎥 ") && href;
      const isInternalLink =
        href &&
        (href?.includes("/note/") ||
          href?.includes("/checklist/") ||
          href?.startsWith("/jotty/"));

      if (isInternalLink) {
        let linkType: ItemTypes;
        let linkCategory: string | null = null;
        let linkUuid: string | null = null;
        let linkItemId: string = "";

        if (href?.startsWith("/jotty/")) {
          linkUuid = href.replace("/jotty/", "");
          linkType = ItemTypes.NOTE;
        } else {
          linkType = href?.includes("/note/")
            ? ItemTypes.NOTE
            : ItemTypes.CHECKLIST;
          const pathParts = href
            ?.replace("/checklist/", "")
            .replace("/note/", "")
            .split("/");
          linkItemId = decodeId(pathParts?.[pathParts.length - 1] || "");
          linkCategory = decodeCategoryPath(pathParts?.slice(0, -1).join("/") || "");
        }

        return (
          <InternalLinkComponent
            node={{
              attrs: {
                href: href || "",
                title: childText,
                type: linkType,
                category: linkCategory || "Uncategorized",
                uuid: linkUuid || "",
                itemId: linkItemId,
                convertToBidirectional: false,
              },
            }}
            editor={undefined as any}
            updateAttributes={() => { }}
          />
        );
      }

      if (isFileAttachment || isVideoAttachment) {
        const fileName = childText.substring(2);
        const isImage = href.includes("/api/image/");
        const isVideo = href.includes("/api/video/");
        const mimeType = isImage
          ? "image/jpeg"
          : isVideo
            ? "video/mp4"
            : "application/octet-stream";

        if (isImage) {
          return (
            <ImageAttachment url={href} fileName={fileName} className="my-4" />
          );
        } else if (isVideo) {
          return (
            <VideoAttachment
              url={href}
              fileName={fileName}
              mimeType={mimeType}
              className="my-4"
            />
          );
        } else {
          return (
            <FileAttachment
              url={href}
              fileName={fileName}
              mimeType={mimeType}
              className="my-4"
            />
          );
        }
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
          <li className={`${className || ""}`} {...props}>
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
    div({ node, ...props }: any) {
      const isDrawio = props["data-drawio"] !== undefined ||
        props.dataDrawio !== undefined ||
        (node && node.properties && node.properties["data-drawio"] !== undefined);

      if (isDrawio) {
        const svgData = props["data-drawio-svg"] ||
          props.dataDrawioSvg ||
          (node?.properties?.["data-drawio-svg"]);
        return <DrawioRenderer svgData={svgData} />;
      }

      if (props["data-mermaid"] !== undefined || props.dataMermaid !== undefined) {
        const mermaidContent = props["data-mermaid-content"] ||
          props.dataMermaidContent ||
          (node?.properties?.["data-mermaid-content"]) || "";
        return <MermaidRenderer code={mermaidContent} />;
      }

      return <div {...props} />;
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
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};
