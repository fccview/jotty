"use client";

import { Copy01Icon, Tick02Icon, SourceCodeIcon } from "hugeicons-react";
import { useState, ReactElement } from "react";
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

  const languageObj = getLanguageByValue(language.replace("hljs ", ""));

  const languageIcon = languageObj?.icon || (
    <SourceCodeIcon className="h-4 w-4" />
  );
  const displayLanguage = languageObj?.label || language.replace("hljs ", "");

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
          <div className="flex items-center gap-1.5">
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

      <pre className="hljs !bg-transparent !p-4 !m-0 overflow-x-auto text-sm">
        {children}
      </pre>
    </div>
  );
};
