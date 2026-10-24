"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DiagramFrame } from "@/app/_components/FeatureComponents/Notes/Parts/Diagrams/DiagramFrame";
import { DiagramTheme, toDiagramTheme } from "@/app/_utils/markdown/diagram-comment";

interface ExcalidrawRendererProps {
  svgData: string;
  themeMode?: string;
  className?: string;
}

export const ExcalidrawRenderer = ({ svgData, themeMode, className = "" }: ExcalidrawRendererProps) => {
  const t = useTranslations();
  const [override, setOverride] = useState<DiagramTheme | null>(null);
  const theme = override ?? toDiagramTheme(themeMode);

  return (
    <DiagramFrame
      svg={svgData}
      alt={t("editor.excalidrawDiagram")}
      themeMode={theme}
      onToggleTheme={() => setOverride(theme === DiagramTheme.Dark ? DiagramTheme.Light : DiagramTheme.Dark)}
      placeholder={<p className="text-center text-muted-foreground">{t("notes.excalidrawNoPreview")}</p>}
      className={className}
    />
  );
};
