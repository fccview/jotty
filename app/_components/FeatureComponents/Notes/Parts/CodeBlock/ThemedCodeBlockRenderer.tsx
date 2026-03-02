"use client";

import { Copy01Icon, Tick02Icon, SourceCodeIcon } from "hugeicons-react";
import { useState, ReactElement } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { getLanguageByValue } from "@/app/_utils/code-block-utils";
import { cn, copyTextToClipboard } from "@/app/_utils/global-utils";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { usePrismTheme } from "@/app/_hooks/usePrismThemes";

interface ThemedCodeBlockRendererProps {
  children: ReactElement<any>;
  className?: string;
  language?: string;
  code: string;
}

export const ThemedCodeBlockRenderer = ({
  children,
  className = "",
  language: langProp,
  code,
}: ThemedCodeBlockRendererProps) => {
  const [copied, setCopied] = useState(false);
  const { user } = useAppMode();
  usePrismTheme(user?.markdownTheme || "prism");

  const languageMappers = [
    { value: "plaintext", label: "text" },
    { value: "yml", label: "yaml" },
    { value: "js", label: "javascript" },
    { value: "ts", label: "typescript" },
    { value: "jsx", label: "javascript" },
    { value: "tsx", label: "typescript" },
  ];

  let language =
    langProp ||
    children.props.className?.replace("language-", "") ||
    "plaintext";

  const languageObj = getLanguageByValue(
    languageMappers.find((lang) => language === lang.value)?.label || language
  );

  const languageIcon = languageObj?.icon || (
    <SourceCodeIcon className="h-3.5 w-3.5" />
  );

  const displayLanguage =
    languageObj?.label || (language === "plaintext" ? "text" : language);

  return (
    <div
      className={cn(
        "themed-code-block relative group my-4 overflow-hidden bg-muted border border-border rounded-jotty",
        className
      )}
    >
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/80">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
          <span
            className={`${languageObj?.value || ""} language-icon text-xs rounded inline-block`}
          >
            {languageIcon}
          </span>
          <span>{displayLanguage}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            copyTextToClipboard(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
        >
          {copied ? (
            <Tick02Icon className="h-3 w-3 text-green-500" />
          ) : (
            <Copy01Icon className="h-3 w-3" />
          )}
        </Button>
      </div>

      <pre
        className={`!bg-transparent !p-4 !m-0 overflow-x-auto text-md lg:text-sm text-foreground language-${language}`}
      >
        {children}
      </pre>
    </div>
  );
};
