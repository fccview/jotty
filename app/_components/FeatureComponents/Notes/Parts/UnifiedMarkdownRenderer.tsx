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
import { ExcalidrawRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/ExcalidrawRenderer";
import { FileAttachment } from "@/app/_components/GlobalComponents/FormElements/FileAttachment";
import type { Components } from "react-markdown";
import { QUOTES } from "@/app/_consts/notes";
import { ImageAttachment } from "@/app/_components/GlobalComponents/FormElements/ImageAttachment";
import { VideoAttachment } from "@/app/_components/GlobalComponents/FormElements/VideoAttachment";
import { prism } from "@/app/_utils/prism-utils";
import { InternalLinkComponent } from "./TipTap/CustomExtensions/InternalLinkComponent";
import { TagLinkViewComponent } from "@/app/_components/FeatureComponents/Tags/TagLinkComponent";
import { ItemTypes } from "@/app/_types/enums";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { decodeCategoryPath, decodeId } from "@/app/_utils/global-utils";
import { NoteFooterStats } from "@/app/_components/GlobalComponents/Statistics/NoteFooterStats";
import { useTranslations } from "next-intl";
import {
  Idea01Icon,
  AlertDiamondIcon,
  Tick02Icon,
  AlertCircleIcon,
} from "hugeicons-react";

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
  forceLightMode?: boolean;
}

export const UnifiedMarkdownRenderer = ({
  content,
  className = "",
  forceLightMode = false,
}: UnifiedMarkdownRendererProps) => {
  const [isClient, setIsClient] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const t = useTranslations();
  const { contentWithoutMetadata } = extractYamlMetadata(content);

  let processedContent = contentWithoutMetadata.replace(
    /<!--\s*drawio-diagram\s+data:\s*([^\n]+)\s+svg:\s*([^\n]+)(?:\s+theme:\s*([^\n]+))?\s*-->/g,
    (match, dataBase64, svgBase64, theme) => {
      try {
        const diagramData = atob(dataBase64.trim());
        const svgData = atob(svgBase64.trim());
        const themeMode = theme ? theme.trim() : "light";
        return `<div data-drawio="" data-drawio-data="${diagramData.replace(
          /"/g,
          "&quot;"
        )}" data-drawio-svg="${svgBase64.trim()}" data-drawio-theme="${themeMode}">[Draw.io Diagram]</div>`;
      } catch (e) {
        return match;
      }
    }
  );

  processedContent = processedContent.replace(
    /<!--\s*excalidraw-diagram\s+data:\s*([^\n]+)(?:\s+svg:\s*([^\n]+))?(?:\s+theme:\s*([^\n]+))?\s*-->/g,
    (match, dataBase64, svgBase64, theme) => {
      try {
        const diagramData = atob(dataBase64.trim());
        const svgData = svgBase64 ? atob(svgBase64.trim()) : "";
        const themeMode = theme ? theme.trim() : "light";
        return `<div data-excalidraw="" data-excalidraw-data="${diagramData.replace(
          /"/g,
          "&quot;"
        )}" data-excalidraw-svg="${svgData.replace(
          /"/g,
          "&quot;"
        )}" data-excalidraw-theme="${themeMode}">[Excalidraw Diagram]</div>`;
      } catch (e) {
        return match;
      }
    }
  );

  const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g;
  const codeBlocks: string[] = [];
  processedContent = processedContent.replace(codeBlockRegex, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });
  processedContent = processedContent.replace(
    /(?:^|(?<=[\s(]))#([a-zA-Z][a-zA-Z0-9_/-]*)/gm,
    '<span data-tag="$1">$1</span>'
  );
  codeBlocks.forEach((block, i) => {
    processedContent = processedContent.replace(`__CODE_BLOCK_${i}__`, block);
  });

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
          <p className="text-md lg:text-sm text-muted-foreground mt-4">
            {t("notes.startWritingAbove")}
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
          return <MermaidRenderer code={rawCode} forceLightMode={forceLightMode} />;
        }

        let highlightedHtml: string;

        if (!prism.registered(language)) {
          highlightedHtml = rawCode;
        } else {
          highlightedHtml = prism.highlight(language, rawCode);
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
            {prism.registered(language) ? (newCodeElement as any) : children}
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
          linkCategory = decodeCategoryPath(
            pathParts?.slice(0, -1).join("/") || ""
          );
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
    blockquote({ node, children, ...props }) {
      const childArray = Children.toArray(children);
      let calloutType: "info" | "warning" | "success" | "danger" | null = null;
      let matchIndex = -1;

      for (let i = 0; i < childArray.length; i++) {
        const child = childArray[i];
        if (isValidElement(child)) {
          const textContent = getRawTextFromChildren(child.props?.children);
          const match = textContent.match(/^\[!(INFO|WARNING|SUCCESS|DANGER)\]/i);
          if (match) {
            calloutType = match[1].toLowerCase() as "info" | "warning" | "success" | "danger";
            matchIndex = i;
            break;
          }
        }
      }

      if (calloutType && matchIndex >= 0) {
        const CalloutIcon = {
          info: Idea01Icon,
          warning: AlertDiamondIcon,
          success: Tick02Icon,
          danger: AlertCircleIcon,
        }[calloutType];

        const stripCalloutPrefix = (children: React.ReactNode): React.ReactNode => {
          const childArr = Children.toArray(children);
          let prefixStripped = false;

          return Children.map(childArr, (child) => {
            if (prefixStripped) return child;

            if (typeof child === "string") {
              const match = child.match(/^\[!(INFO|WARNING|SUCCESS|DANGER)\]\s*/i);
              if (match) {
                prefixStripped = true;
                const remaining = child.replace(match[0], "");
                return remaining || null;
              }
              return child;
            }

            if (isValidElement(child) && child.props?.children) {
              const newChildren = stripCalloutPrefix(child.props.children);
              if (newChildren !== child.props.children) {
                prefixStripped = true;
                return { ...child, props: { ...child.props, children: newChildren } };
              }
            }

            return child;
          });
        };

        const modifiedChildren = Children.map(children, (child, index) => {
          if (index === matchIndex && isValidElement(child)) {
            const newChildren = stripCalloutPrefix(child.props?.children);
            const hasContent = Children.toArray(newChildren).some(
              (c) => (typeof c === "string" && c.trim()) || isValidElement(c)
            );
            if (!hasContent) {
              return null;
            }
            return { ...child, props: { ...child.props, children: newChildren } };
          }
          return child;
        })?.filter(Boolean);

        return (
          <div className={`callout callout-${calloutType}`}>
            <div className="flex gap-3">
              <div className={`flex-shrink-0 pt-0.5 callout-icon-${calloutType}`}>
                <CalloutIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                {modifiedChildren}
              </div>
            </div>
          </div>
        );
      }

      return <blockquote {...props}>{children}</blockquote>;
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
      const isDrawio =
        props["data-drawio"] !== undefined ||
        props.dataDrawio !== undefined ||
        (node &&
          node.properties &&
          node.properties["data-drawio"] !== undefined);

      if (isDrawio) {
        const rawSvgData =
          props["data-drawio-svg"] ||
          props.dataDrawioSvg ||
          node?.properties?.["data-drawio-svg"];
        let decodedSvgData = rawSvgData;
        try {
          if (rawSvgData && !rawSvgData.trim().startsWith("<")) {
            decodedSvgData = atob(rawSvgData);
          }
        } catch (e) {}
        const themeMode = forceLightMode
          ? "light"
          : props["data-drawio-theme"] ||
            props.dataDrawioTheme ||
            node?.properties?.["data-drawio-theme"] ||
            "light";
        return <DrawioRenderer svgData={decodedSvgData} themeMode={themeMode} />;
      }

      const isExcalidraw =
        props["data-excalidraw"] !== undefined ||
        props.dataExcalidraw !== undefined ||
        (node &&
          node.properties &&
          node.properties["data-excalidraw"] !== undefined);

      if (isExcalidraw) {
        const excalidrawSvgData =
          props["data-excalidraw-svg"] ||
          props.dataExcalidrawSvg ||
          node?.properties?.["data-excalidraw-svg"] ||
          "";
        const themeMode = forceLightMode
          ? "light"
          : props["data-excalidraw-theme"] ||
            props.dataExcalidrawTheme ||
            node?.properties?.["data-excalidraw-theme"] ||
            "light";

        return <ExcalidrawRenderer svgData={excalidrawSvgData} themeMode={themeMode} />;
      }

      if (
        props["data-mermaid"] !== undefined ||
        props.dataMermaid !== undefined
      ) {
        const mermaidContent =
          props["data-mermaid-content"] ||
          props.dataMermaidContent ||
          node?.properties?.["data-mermaid-content"] ||
          "";
        return <MermaidRenderer code={mermaidContent} forceLightMode={forceLightMode} />;
      }

      const isCallout =
        props["data-type"] === "callout" ||
        props.dataType === "callout" ||
        node?.properties?.["data-type"] === "callout";

      if (isCallout) {
        const calloutType: "info" | "warning" | "success" | "danger" =
          props["data-callout-type"] ||
          props.dataCalloutType ||
          node?.properties?.["data-callout-type"] ||
          "info";
        const { children, ...restProps } = props;
        const CalloutIcon = {
          info: Idea01Icon,
          warning: AlertDiamondIcon,
          success: Tick02Icon,
          danger: AlertCircleIcon,
        }[calloutType] || Idea01Icon;
        return (
          <div
            {...restProps}
            className={`callout callout-${calloutType}`}
          >
            <div className="flex gap-3">
              <div className={`flex-shrink-0 pt-0.5 callout-icon-${calloutType}`}>
                <CalloutIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                {children}
              </div>
            </div>
          </div>
        );
      }

      return <div {...props} />;
    },
    span({ node, ...props }: any) {
      const dataTag =
        props["data-tag"] ||
        props.dataTag ||
        node?.properties?.["data-tag"] ||
        node?.properties?.dataTag;

      if (dataTag) {
        return <TagLinkViewComponent tag={dataTag} />;
      }

      return <span {...props} />;
    },
  };

  return (
    <>
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
      <NoteFooterStats content={content} />
    </>
  );
};
