"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { useTranslations } from "next-intl";

interface MermaidRendererProps {
  code: string;
  className?: string;
  forceLightMode?: boolean;
}

const _getCSSVariable = (variable: string, forceLight: boolean): string => {
  if (forceLight || typeof window === 'undefined') return '';
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  if (value && /^\d+\s+\d+\s+\d+$/.test(value)) {
    return `rgb(${value.replace(/\s+/g, ', ')})`;
  }
  return value;
};

const initializeMermaidTheme = (forceLight = false) => {
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    securityLevel: "loose",
    themeVariables: {
      primaryColor: _getCSSVariable('--primary', forceLight) || 'rgb(139, 59, 208)',
      primaryTextColor: _getCSSVariable('--primary-foreground', forceLight) || 'rgb(255, 255, 255)',
      primaryBorderColor: _getCSSVariable('--foreground', forceLight) || 'rgb(20, 20, 20)',
      lineColor: _getCSSVariable('--primary', forceLight) || 'rgb(139, 59, 208)',
      secondaryColor: _getCSSVariable('--secondary', forceLight) || 'rgb(243, 240, 249)',
      tertiaryColor: _getCSSVariable('--muted', forceLight) || 'rgb(243, 240, 249)',
      background: _getCSSVariable('--background', forceLight) || 'rgb(255, 255, 255)',
      mainBkg: _getCSSVariable('--background', forceLight) || 'rgb(255, 255, 255)',
      secondBkg: _getCSSVariable('--muted', forceLight) || 'rgb(243, 240, 249)',
      tertiaryBkg: _getCSSVariable('--accent', forceLight) || 'rgb(243, 240, 249)',
      textColor: _getCSSVariable('--foreground', forceLight) || 'rgb(20, 20, 20)',
      border1: _getCSSVariable('--foreground', forceLight) || 'rgb(20, 20, 20)',
      border2: _getCSSVariable('--foreground', forceLight) || 'rgb(20, 20, 20)',
      nodeBorder: _getCSSVariable('--foreground', forceLight) || 'rgb(20, 20, 20)',
      clusterBkg: _getCSSVariable('--muted', forceLight) || 'rgb(243, 240, 249)',
      clusterBorder: _getCSSVariable('--foreground', forceLight) || 'rgb(20, 20, 20)',
      defaultLinkColor: _getCSSVariable('--primary', forceLight) || 'rgb(139, 59, 208)',
      titleColor: _getCSSVariable('--foreground', forceLight) || 'rgb(20, 20, 20)',
      edgeLabelBackground: _getCSSVariable('--background', forceLight) || 'rgb(255, 255, 255)',
      nodeTextColor: _getCSSVariable('--foreground', forceLight) || 'rgb(20, 20, 20)',
    },
  });
};

if (typeof window !== 'undefined') {
  initializeMermaidTheme();
}

export const MermaidRenderer = ({ code, className = "", forceLightMode = false }: MermaidRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations();

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !code) return;

      try {
        initializeMermaidTheme(forceLightMode);

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
  }, [code, forceLightMode]);

  if (error) {
    return (
      <div className={`border border-destructive rounded p-4 my-4 ${className}`}>
        <div className="text-destructive text-sm">
          <div className="font-semibold mb-1">{t("notes.mermaidError")}</div>
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
