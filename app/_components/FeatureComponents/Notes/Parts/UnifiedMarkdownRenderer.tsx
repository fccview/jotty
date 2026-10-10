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
import { ThemedCodeBlockRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/CodeBlock/ThemedCodeBlockRenderer";
import { MermaidRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/MermaidRenderer";
import { DrawioRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/DrawioRenderer";
import { ExcalidrawRenderer } from "@/app/_components/FeatureComponents/Notes/Parts/ExcalidrawRenderer";
import { FileAttachment } from "@/app/_components/GlobalComponents/FormElements/FileAttachment";
import type { Components } from "react-markdown";
import { QUOTES } from "@/app/_consts/notes";
import { ImageAttachment } from "@/app/_components/GlobalComponents/FormElements/ImageAttachment";
import { VideoAttachment } from "@/app/_components/GlobalComponents/FormElements/VideoAttachment";
import { prism } from "@/app/_utils/prism-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { InternalLinkComponent } from "./TipTap/CustomExtensions/InternalLinkComponent";
import { TagLinkViewComponent } from "@/app/_components/FeatureComponents/Tags/TagLinkComponent";
import { extractYamlMetadata } from "@/app/_utils/yaml-metadata-utils";
import { currentOrigins, parseItemHref } from "@/app/_utils/item-href-utils";
import { remarkWikilinks, WIKILINK_TAG } from "@/app/_utils/wikilink-utils";
import { WikiLink } from "./WikiLink";
import { matchCallout } from "@/app/_utils/callout-utils";
import { CalloutType } from "@/app/_consts/callouts";
import { base64ToSvg, base64ToText } from "@/app/_utils/base64-utils";
import { noteUrlTransform } from "@/app/_utils/url-transform-utils";
import { BOUNCED_ELEMENTS } from "@/app/_consts/notes";
import { tagOutsideCode } from "@/app/_utils/markdown-utils";
import { rehypeTableWhitespace } from "@/app/_utils/rehype-table-whitespace";
import { useInlineCodeCopy } from "@/app/_hooks/useInlineCodeCopy";

type WikiLinkComponents = Record<
  typeof WIKILINK_TAG,
  (props: { target?: string; label?: string }) => React.ReactElement
>;
import { NoteFooterStats } from "@/app/_components/GlobalComponents/Statistics/NoteFooterStats";
import { useTranslations } from "next-intl";
import {
  Idea01Icon,
  AlertDiamondIcon,
  Tick02Icon,
  AlertCircleIcon,
} from "hugeicons-react";

const TRAILING_NEWLINE = /\n$/;
const NESTED_LISTS = new Set(["ul", "ol"]);

type HastProps = { node?: { tagName?: string }; type?: string; checked?: boolean };

const isCheckbox = (child: unknown): child is ReactElement<HastProps> =>
  isValidElement<HastProps>(child) &&
  child.props.node?.tagName === "input" &&
  child.props.type === "checkbox";

const isNestedList = (child: unknown) =>
  isValidElement<HastProps>(child) &&
  NESTED_LISTS.has(child.props.node?.tagName || "");

const getRawTextFromChildren = (children: React.ReactNode): string => {
  let text = "";
  Children.forEach(children, (child) => {
    if (typeof child === "string") {
      text += child;
    } else if (isValidElement(child)) {
      const props = child.props as Record<string, unknown>;
      if (props.children) {
        text += getRawTextFromChildren(props.children as React.ReactNode);
      }
    }
  });
  return text;
};

interface UnifiedMarkdownRendererProps {
  content: string;
  className?: string;
  forceLightMode?: boolean;
  showStats?: boolean;
}

export const UnifiedMarkdownRenderer = ({
  content,
  className = "",
  forceLightMode = false,
  showStats = true,
}: UnifiedMarkdownRendererProps) => {
  const [isClient, setIsClient] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const t = useTranslations();
  const copyInlineCode = useInlineCodeCopy();
  const { user } = useAppMode();
  const ActiveCodeBlockRenderer =
    user?.codeBlockStyle === "themed"
      ? ThemedCodeBlockRenderer
      : CodeBlockRenderer;
  const { contentWithoutMetadata } = extractYamlMetadata(content);

  let processedContent = contentWithoutMetadata.replace(
    /<!--\s*drawio-diagram\s+data:\s*([^\n]+)\s+svg:\s*([^\n]+)(?:\s+theme:\s*([^\n]+))?\s*-->/g,
    (match, dataBase64, svgBase64, theme) => {
      try {
        const diagramData = base64ToText(dataBase64.trim());
        const themeMode = theme ? theme.trim() : "light";
        return `<div data-drawio="" data-drawio-data="${diagramData.replace(
          /"/g,
          "&quot;",
        )}" data-drawio-svg="${svgBase64.trim()}" data-drawio-theme="${themeMode}">[Draw.io Diagram]</div>`;
      } catch (e) {
        console.error("Failed to decode drawio diagram:", e);
        return match;
      }
    },
  );

  processedContent = processedContent.replace(
    /<!--\s*excalidraw-diagram\s+data:\s*([^\n]+)(?:\s+svg:\s*([^\n]+))?(?:\s+theme:\s*([^\n]+))?\s*-->/g,
    (match, dataBase64, svgBase64, theme) => {
      try {
        const diagramData = base64ToText(dataBase64.trim());
        const svgData = svgBase64 ? base64ToText(svgBase64.trim()) : "";
        const themeMode = theme ? theme.trim() : "light";
        return `<div data-excalidraw="" data-excalidraw-data="${diagramData.replace(
          /"/g,
          "&quot;",
        )}" data-excalidraw-svg="${svgData.replace(
          /"/g,
          "&quot;",
        )}" data-excalidraw-theme="${themeMode}">[Excalidraw Diagram]</div>`;
      } catch (e) {
        console.error("Failed to decode excalidraw diagram:", e);
        return match;
      }
    },
  );

  processedContent = tagOutsideCode(processedContent);

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

  const components: Partial<Components> & WikiLinkComponents = {
    [WIKILINK_TAG]: ({ target, label }: { target?: string; label?: string }) => (
      <WikiLink target={target} label={label} />
    ),
    table: ({ node, children, ...props }) => (
      <div className="jotty-x-scroll">
        <table {...props}>{children}</table>
      </div>
    ),
    pre: ({ node, children, ...props }) => {
      const child = Children.toArray(children)[0];

      if (isValidElement(child) && child.type === "code") {
        const codeElement = child as ReactElement<any>;
        const language =
          codeElement.props.className?.replace("language-", "") || "plaintext";
        const rawCode = getRawTextFromChildren(
          codeElement.props.children,
        ).replace(TRAILING_NEWLINE, "");

        if (language === "mermaid") {
          return (
            <MermaidRenderer code={rawCode} forceLightMode={forceLightMode} />
          );
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
          <ActiveCodeBlockRenderer code={rawCode} language={language}>
            {prism.registered(language) ? (newCodeElement as any) : children}
          </ActiveCodeBlockRenderer>
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
      const itemTarget = parseItemHref(href, currentOrigins());

      if (href && itemTarget) {
        return (
          <InternalLinkComponent
            node={{
              attrs: {
                href,
                title: childText,
                type: itemTarget.type,
                category: itemTarget.legacy?.category,
                uuid: itemTarget.uuid,
                itemId: itemTarget.legacy?.id,
              },
            }}
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
    input({ node, type, checked, ...props }) {
      if (type === "checkbox") {
        return <input type="checkbox" checked={checked} disabled {...props} />;
      }
      return <input type={type} {...props} />;
    },
    blockquote({ node, children, ...props }) {
      const childArray = Children.toArray(children);
      let calloutType: CalloutType | null = null;
      let matchIndex = -1;

      for (let i = 0; i < childArray.length; i++) {
        const child = childArray[i];
        if (isValidElement(child)) {
          const childProps = child.props as Record<string, unknown>;
          const textContent = getRawTextFromChildren(
            childProps?.children as React.ReactNode,
          );
          const callout = matchCallout(textContent);
          if (callout) {
            calloutType = callout.type;
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

        const stripCalloutPrefix = (
          children: React.ReactNode,
        ): React.ReactNode => {
          const childArr = Children.toArray(children);
          let prefixStripped = false;

          return Children.map(childArr, (child) => {
            if (prefixStripped) return child;

            if (typeof child === "string") {
              const callout = matchCallout(child);
              if (callout) {
                prefixStripped = true;
                const remaining = child.replace(callout.marker, "");
                return remaining || null;
              }
              return child;
            }

            if (isValidElement(child)) {
              const cProps = child.props as Record<string, unknown>;
              if (cProps?.children) {
                const newChildren = stripCalloutPrefix(
                  cProps.children as React.ReactNode,
                );
                if (newChildren !== cProps.children) {
                  prefixStripped = true;
                  return {
                    ...child,
                    props: { ...cProps, children: newChildren },
                  };
                }
              }
            }

            return child;
          });
        };

        const modifiedChildren = Children.map(children, (child, index) => {
          if (index === matchIndex && isValidElement(child)) {
            const cProps = child.props as Record<string, unknown>;
            const newChildren = stripCalloutPrefix(
              cProps?.children as React.ReactNode,
            );
            const hasContent = Children.toArray(newChildren).some(
              (c) => (typeof c === "string" && c.trim()) || isValidElement(c),
            );
            if (!hasContent) {
              return null;
            }
            return { ...child, props: { ...cProps, children: newChildren } };
          }
          return child;
        })?.filter(Boolean);

        return (
          <div className={`callout callout-${calloutType}`}>
            <div className="callout-wrapper">
              <div className={`callout-icon callout-icon-${calloutType}`}>
                <CalloutIcon />
              </div>
              <div className="callout-content">{modifiedChildren}</div>
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
          <ul className={className} {...props}>
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

      const [box, ...rest] = Children.toArray(children);

      if (isTaskItem && isCheckbox(box)) {
        const nested = rest.filter(isNestedList);
        const text = rest.filter((child) => !isNestedList(child));
        return (
          <li
            className={className}
            data-checked={String(Boolean(box.props.checked))}
            {...props}
          >
            {box}
            <div>
              <p>{text}</p>
              {nested}
            </div>
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
            decodedSvgData = base64ToSvg(rawSvgData);
          }
        } catch (e) {
          console.error("Failed to decode drawio preview:", e);
        }
        const themeMode = forceLightMode
          ? "light"
          : props["data-drawio-theme"] ||
            props.dataDrawioTheme ||
            node?.properties?.["data-drawio-theme"] ||
            "light";
        return (
          <DrawioRenderer svgData={decodedSvgData} themeMode={themeMode} />
        );
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

        return (
          <ExcalidrawRenderer
            svgData={excalidrawSvgData}
            themeMode={themeMode}
          />
        );
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
        return (
          <MermaidRenderer
            code={mermaidContent}
            forceLightMode={forceLightMode}
          />
        );
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
        const CalloutIcon =
          {
            info: Idea01Icon,
            warning: AlertDiamondIcon,
            success: Tick02Icon,
            danger: AlertCircleIcon,
          }[calloutType] || Idea01Icon;
        return (
          <div {...restProps} className={`callout callout-${calloutType}`}>
            <div className="callout-wrapper">
              <div className={`callout-icon callout-icon-${calloutType}`}>
                <CalloutIcon />
              </div>
              <div className="callout-content">{children}</div>
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
        className={`prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl dark:prose-invert [&_ul]:list-disc [&_ol]:list-decimal jotty-copyable-code ${className}`}
        onClick={copyInlineCode}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkWikilinks]}
          rehypePlugins={[rehypeSlug, rehypeRaw, rehypeTableWhitespace]}
          components={components}
          urlTransform={noteUrlTransform}
          disallowedElements={BOUNCED_ELEMENTS}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
      {showStats && <NoteFooterStats content={content} />}
    </>
  );
};
