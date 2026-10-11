"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useThemeTone } from "@/app/_hooks/useThemeTone";
import { mermaidErrorText, renderMermaid } from "@/app/_utils/mermaid-utils";

interface MermaidRendererProps {
  code: string;
  className?: string;
  forceLightMode?: boolean;
}

interface MermaidOutput {
  svg: string;
  error: string | null;
}

const EMPTY_OUTPUT: MermaidOutput = { svg: "", error: null };

const bodyTracking = () =>
  typeof window === "undefined" ? undefined : getComputedStyle(document.body).letterSpacing;

export const MermaidRenderer = ({ code, className = "", forceLightMode = false }: MermaidRendererProps) => {
  const t = useTranslations();
  const { key: themeKey } = useThemeTone();
  const [output, setOutput] = useState<MermaidOutput>(EMPTY_OUTPUT);
  const [tracking, setTracking] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!code.trim()) {
      setOutput(EMPTY_OUTPUT);
      return;
    }
    let cancelled = false;
    renderMermaid(code, forceLightMode)
      .then((svg) => {
        if (cancelled) return;
        setTracking(bodyTracking());
        setOutput({ svg, error: null });
      })
      .catch((error) => {
        console.warn(`Mermaid diagram did not render: ${mermaidErrorText(error)}`);
        if (!cancelled) setOutput({ svg: "", error: mermaidErrorText(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [code, forceLightMode, themeKey]);

  if (output.error !== null) {
    return (
      <div role="alert" className={`border border-destructive rounded-jotty bg-destructive/10 p-4 my-4 ${className}`}>
        <div className="text-destructive text-sm">
          <div className="font-semibold mb-1">{t("notes.mermaidError")}</div>
          <pre className="font-mono text-xs whitespace-pre-wrap m-0 p-0 bg-transparent text-destructive">
            {output.error}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mermaid-diagram flex justify-center items-center my-4 min-h-[2rem] [&_svg]:max-w-full [&_svg]:h-auto ${className}`}
      style={{ letterSpacing: tracking }}
      dangerouslySetInnerHTML={{ __html: output.svg }}
    />
  );
};
