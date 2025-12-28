"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Sun03Icon, GibbousMoonIcon } from "hugeicons-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false }
);

export const ExcalidrawNodeView = ({
  node,
  updateAttributes,
  deleteNode,
}: any) => {
  const t = useTranslations();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [initialData, setInitialData] = useState<any>(null);
  const themeMode = node.attrs.themeMode || "light";

  useEffect(() => {
    if (node.attrs.diagramData) {
      try {
        const parsed = JSON.parse(node.attrs.diagramData);
        setInitialData({
          elements: parsed.elements || [],
          appState: {
            ...parsed.appState,
            zoom: { value: 0.5 },
          },
          files: parsed.files || null,
        });
      } catch (e) {
        setInitialData({ elements: [], appState: {}, files: null });
      }
    } else {
      setInitialData({ elements: [], appState: {}, files: null });
    }
  }, [node]);

  const handleSave = async () => {
    if (excalidrawAPI) {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();

      const sceneData = {
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemStrokeColor: appState.currentItemStrokeColor,
          currentItemBackgroundColor: appState.currentItemBackgroundColor,
          currentItemFillStyle: appState.currentItemFillStyle,
          currentItemStrokeWidth: appState.currentItemStrokeWidth,
          currentItemRoughness: appState.currentItemRoughness,
          currentItemOpacity: appState.currentItemOpacity,
          gridSize: appState.gridSize,
          zoom: appState.zoom,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
        },
        files: files || null,
      };

      const { exportToSvg } = await import("@excalidraw/excalidraw");
      const svg = await exportToSvg({
        elements,
        appState,
        files,
        exportPadding: 20,
      });
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("style", "max-width: 100%; height: auto;");
      const svgString = svg.outerHTML;

      updateAttributes({
        diagramData: JSON.stringify(sceneData),
        svgData: svgString,
      });

      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (confirm(t('common.confirmDeleteItem', { itemTitle: t('editor.excalidrawDiagram') }))) {
      deleteNode();
    }
  };

  const toggleTheme = () => {
    updateAttributes({
      themeMode: themeMode === "light" ? "dark" : "light",
    });
  };

  const hasData = node.attrs.diagramData &&
    node.attrs.diagramData !== "null" &&
    node.attrs.diagramData !== JSON.stringify({ elements: [], appState: {}, files: null });

  return (
    <NodeViewWrapper className="excalidraw-node-wrapper">
      {isEditing && initialData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-background rounded-jotty shadow-xl w-[95vw] h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h3 className="font-semibold">{t("editor.editDiagram")}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 bg-muted hover:bg-muted/80 rounded text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded text-sm"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
            <div className="flex-1 w-full">
              <Excalidraw
                excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
                initialData={initialData}
              />
            </div>
          </div>
        </div>
      )}

      <div className="excalidraw-diagram-container relative group border border-border rounded-jotty p-4 my-4 bg-background">
        {hasData ? (
          <>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 flex gap-1 z-10">
              <button
                onClick={toggleTheme}
                className="px-2 py-1 bg-muted text-foreground rounded text-xs hover:bg-muted/80"
                title={`Switch to ${themeMode === "light" ? "dark" : "light"} mode`}
              >
                {themeMode === "light" ? (
                  <GibbousMoonIcon className="h-3 w-3" />
                ) : (
                  <Sun03Icon className="h-3 w-3" />
                )}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-2 py-1 bg-muted text-foreground rounded text-xs hover:bg-muted/80"
                title={t("editor.editDiagram")}
              >
                {t('common.edit')}
              </button>
              <button
                onClick={handleDelete}
                className="px-2 py-1 bg-destructive text-destructive-foreground rounded text-xs hover:bg-destructive/90"
                title={t("editor.deleteDiagram")}
              >
                {t('common.delete')}
              </button>
            </div>
            <div
              className="flex justify-center items-center"
              style={{
                filter:
                  themeMode === "dark"
                    ? "invert(0.92) contrast(0.85) brightness(1.1) saturate(1.2)"
                    : "none",
              }}
              dangerouslySetInnerHTML={{ __html: node.attrs.svgData || "" }}
            />
          </>
        ) : (
          <div className="text-center py-12">
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              {t("editor.createExcalidrawDiagram")}
            </button>
            <button
              onClick={handleDelete}
              className="ml-2 px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
            >
              {t('common.delete')}
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const ExcalidrawExtension = Node.create({
  name: "excalidraw",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      diagramData: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-excalidraw-data") || null,
        renderHTML: (attributes) => {
          if (!attributes.diagramData) return {};
          return {
            "data-excalidraw-data": attributes.diagramData,
          };
        },
      },
      svgData: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-excalidraw-svg") || null,
        renderHTML: (attributes) => {
          if (!attributes.svgData) return {};
          return {
            "data-excalidraw-svg": attributes.svgData,
          };
        },
      },
      themeMode: {
        default: "light",
        parseHTML: (element) =>
          element.getAttribute("data-excalidraw-theme") || "light",
        renderHTML: (attributes) => {
          return {
            "data-excalidraw-theme": attributes.themeMode || "light",
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-excalidraw]",
        getAttrs: (element) => ({
          diagramData:
            (element as HTMLElement).getAttribute("data-excalidraw-data") || null,
          svgData:
            (element as HTMLElement).getAttribute("data-excalidraw-svg") || null,
          themeMode:
            (element as HTMLElement).getAttribute("data-excalidraw-theme") || "light",
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "div",
      mergeAttributes({
        "data-excalidraw": "",
        "data-excalidraw-data": node.attrs.diagramData || "",
        "data-excalidraw-svg": node.attrs.svgData || "",
        "data-excalidraw-theme": node.attrs.themeMode || "light",
      }),
      "[Excalidraw Diagram]",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExcalidrawNodeView, {
      as: "div",
      contentDOMElementTag: "div",
    });
  },

  /** @ts-ignore */
  addCommands() {
    return {
      insertExcalidraw:
        () =>
          ({ commands }: any) => {
            return commands.insertContent({
              type: this.name,
              attrs: { diagramData: null },
            });
          },
    };
  },
});
