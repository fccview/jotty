"use client";

import { Copy01Icon, Tick02Icon, SourceCodeIcon } from "hugeicons-react";
import { useState, ReactElement, useMemo } from "react";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { getLanguageByValue } from "@/app/_utils/code-block-utils";
import { cn, copyTextToClipboard } from "@/app/_utils/global-utils";

interface CodeBlockRendererProps {
  children: ReactElement;
  className?: string;
  language?: string;
  code: string;
}

export const CodeBlockRenderer = ({
  children,
  className = "",
  language: langProp,
  code,
}: CodeBlockRendererProps) => {
  const [copied, setCopied] = useState(false);

  let language =
    langProp ||
    children.props.className?.replace("language-", "") ||
    "plaintext";

  const languageObj = getLanguageByValue(language);

  const languageIcon = languageObj?.icon || (
    <SourceCodeIcon className="h-4 w-4" />
  );
  const displayLanguage =
    languageObj?.label || (language === "plaintext" ? "" : language);

  const lineCount = useMemo(() => {
    return code.split("\n").length;
  }, [code]);

  const lineNumbers = useMemo(() => {
    return Array.from({ length: lineCount }, (_, i) => i + 1);
  }, [lineCount]);

  return (
    <div
      className={cn(
        "code-block-container relative group my-4 overflow-hidden bg-[#1c1d22] rounded-jotty",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="language-header text-[10px] text-[#abb2bf] bg-[#262626] px-4 py-1">
          <span className="bg-[#abb2bf]" />
          <div
            className={`flex items-center ${
              displayLanguage ? "gap-1.5" : "gap-0"
            }`}
          >
            <span
              className={`${languageObj?.value} language-icon text-xs rounded inline-block`}
            >
              {languageIcon}
            </span>
            <span className="uppercase tracking-wide">{displayLanguage}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            copyTextToClipboard(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="h-6 w-6 p-0 text-gray-400 hover:text-gray-200 hover:bg-transparent mr-2"
        >
          {copied ? (
            <Tick02Icon className="h-3 w-3 text-green-500" />
          ) : (
            <Copy01Icon className="h-3 w-3" />
          )}
        </Button>
      </div>

      <div className="flex min-h-full">
        <div className="py-4 pl-2 pr-3 text-right select-none bg-[#292a2b] text-sm font-mono">
          {lineNumbers.map((num) => (
            <div key={num} className="leading-[21px] text-[#5c6370] opacity-50">
              {num}
            </div>
          ))}
        </div>
        <pre
          className={`!bg-transparent !p-4 !m-0 overflow-x-auto text-sm flex-1 language-${language}`}
        >
          {children}
        </pre>
      </div>
    </div>
  );
};
