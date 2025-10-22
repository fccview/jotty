"use client";

import { Copy, Check, Code } from "lucide-react";
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

  const languageIcon = languageObj?.icon || <Code className="h-4 w-4" />;
  const displayLanguage = languageObj?.label || language.replace("hljs ", "");

  return (
    <div
      className={cn(
        "relative group my-4 overflow-hidden bg-[#282c34]",
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-1 bg-[#21252b] border-b border-[#181a1f]">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#abb2bf]">
          {languageIcon}
          <span className="uppercase tracking-wide">{displayLanguage}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            copyTextToClipboard(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="h-6 w-6 p-0 text-gray-400"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>

      <div className="absolute top-2 right-2 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            copyTextToClipboard(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="transition-opacity opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-gray-400"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>

      <pre className="hljs !bg-transparent !p-4 !m-0 overflow-x-auto text-sm">
        {children}
      </pre>
    </div>
  );
};
