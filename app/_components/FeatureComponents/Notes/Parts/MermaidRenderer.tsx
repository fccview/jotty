"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidRendererProps {
  code: string;
  className?: string;
}

if (typeof window !== "undefined") {
  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
  });
}

export const MermaidRenderer = ({ code, className = "" }: MermaidRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !code) return;

      try {
        setError(null);
        const id = `mermaid-view-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (err: any) {
        setError(err.message || "Invalid Mermaid syntax");
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }
      }
    };

    renderDiagram();
  }, [code]);

  if (error) {
    return (
      <div className={`border border-destructive rounded p-4 my-4 ${className}`}>
        <div className="text-destructive text-sm">
          <div className="font-semibold mb-1">Mermaid Error:</div>
          <div className="font-mono text-xs">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex justify-center items-center my-4 ${className}`}
    />
  );
};
