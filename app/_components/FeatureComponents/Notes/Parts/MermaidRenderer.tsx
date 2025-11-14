"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidRendererProps {
  code: string;
  className?: string;
}

const getCSSVariable = (variable: string): string => {
  if (typeof window === 'undefined') return '';
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  if (value && /^\d+\s+\d+\s+\d+$/.test(value)) {
    return `rgb(${value.replace(/\s+/g, ', ')})`;
  }
  return value;
};

const initializeMermaidTheme = () => {
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    securityLevel: "loose",
    themeVariables: {
      primaryColor: getCSSVariable('--primary') || 'rgb(139, 59, 208)',
      primaryTextColor: getCSSVariable('--primary-foreground') || 'rgb(255, 255, 255)',
      primaryBorderColor: getCSSVariable('--foreground') || 'rgb(20, 20, 20)',
      lineColor: getCSSVariable('--primary') || 'rgb(139, 59, 208)',
      secondaryColor: getCSSVariable('--secondary') || 'rgb(243, 240, 249)',
      tertiaryColor: getCSSVariable('--muted') || 'rgb(243, 240, 249)',
      background: getCSSVariable('--background') || 'rgb(255, 255, 255)',
      mainBkg: getCSSVariable('--background') || 'rgb(255, 255, 255)',
      secondBkg: getCSSVariable('--muted') || 'rgb(243, 240, 249)',
      tertiaryBkg: getCSSVariable('--accent') || 'rgb(243, 240, 249)',
      textColor: getCSSVariable('--foreground') || 'rgb(20, 20, 20)',
      border1: getCSSVariable('--foreground') || 'rgb(20, 20, 20)',
      border2: getCSSVariable('--foreground') || 'rgb(20, 20, 20)',
      nodeBorder: getCSSVariable('--foreground') || 'rgb(20, 20, 20)',
      clusterBkg: getCSSVariable('--muted') || 'rgb(243, 240, 249)',
      clusterBorder: getCSSVariable('--foreground') || 'rgb(20, 20, 20)',
      defaultLinkColor: getCSSVariable('--primary') || 'rgb(139, 59, 208)',
      titleColor: getCSSVariable('--foreground') || 'rgb(20, 20, 20)',
      edgeLabelBackground: getCSSVariable('--background') || 'rgb(255, 255, 255)',
      nodeTextColor: getCSSVariable('--foreground') || 'rgb(20, 20, 20)',
    },
  });
};

if (typeof window !== 'undefined') {
  initializeMermaidTheme();
}

export const MermaidRenderer = ({ code, className = "" }: MermaidRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !code) return;

      try {
        initializeMermaidTheme();

        setError(null);
        const id = `mermaid-view-${Math.random().toString(36).substring(2, 11)}`;
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
