"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { Sun03Icon, GibbousMoonIcon } from "hugeicons-react";

export const DrawioNodeView = ({
  node,
  updateAttributes,
  deleteNode,
  editor,
  extension,
}: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const themeMode = node.attrs.themeMode || "light";

  const drawioBaseUrl =
    extension.storage?.drawioUrl || "https://embed.diagrams.net";
  const drawioUrl = `${drawioBaseUrl}/?embed=1&ui=kennedy&spin=1&proto=json&saveAndExit=1&noSaveBtn=0`;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const drawioOrigin = new URL(drawioBaseUrl).origin;
      if (
        event.origin !== drawioOrigin &&
        !event.origin.includes("diagrams.net")
      )
        return;

      if (event.source !== iframeRef.current?.contentWindow) return;

      if (typeof event.data === "string" && event.data.length > 0) {
        try {
          const message = JSON.parse(event.data);
          const drawioOrigin = new URL(drawioBaseUrl).origin;

          if (message.event === "init") {
            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
              if (node.attrs.diagramData) {
                iframe.contentWindow.postMessage(
                  JSON.stringify({
                    action: "load",
                    xml: node.attrs.diagramData,
                  }),
                  drawioOrigin
                );
              } else {
                iframe.contentWindow.postMessage(
                  JSON.stringify({
                    action: "load",
                    xml: "<mxGraphModel><root><mxCell id='0'/><mxCell id='1' parent='0'/></root></mxGraphModel>",
                  }),
                  drawioOrigin
                );
              }
            }
          } else if (message.event === "save") {
            const xml = message.xml;

            const iframe = iframeRef.current;
            if (iframe?.contentWindow) {
              iframe.contentWindow.postMessage(
                JSON.stringify({
                  action: "export",
                  format: "svg",
                }),
                drawioOrigin
              );
            }

            updateAttributes({
              diagramData: xml,
            });
          } else if (message.event === "export") {
            let svgData = message.data;

            if (
              typeof svgData === "string" &&
              svgData.startsWith("data:image/svg+xml;base64,")
            ) {
              try {
                const base64Data = svgData.replace(
                  "data:image/svg+xml;base64,",
                  ""
                );
                svgData = atob(base64Data);
              } catch (e) {
                console.error("Failed to decode SVG:", e);
              }
            }

            updateAttributes({
              svgData: svgData,
            });

            setIsEditing(false);
          } else if (message.event === "exit") {
            setIsEditing(false);
          }
        } catch (e) {
          // Ignore non-JSON messages
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [node.attrs.diagramData, updateAttributes, drawioBaseUrl]);

  const openDrawio = () => {
    setIsEditing(true);
  };

  const handleDelete = () => {
    if (confirm("Delete this diagram?")) {
      deleteNode();
    }
  };

  const toggleTheme = () => {
    updateAttributes({
      themeMode: themeMode === "light" ? "dark" : "light",
    });
  };

  return (
    <NodeViewWrapper className="drawio-node-wrapper">
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-background rounded-jotty shadow-xl w-[95vw] h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-border">
              <h3 className="font-semibold">Edit Diagram</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 bg-muted hover:bg-muted/80 rounded text-sm"
              >
                Close
              </button>
            </div>
            <iframe
              ref={iframeRef}
              src={drawioUrl}
              className="flex-1 w-full border-0"
            />
          </div>
        </div>
      )}

      <div className="drawio-diagram-container relative group border border-border rounded-jotty p-4 my-4 bg-background">
        {node.attrs.svgData ? (
          <>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 flex gap-1 z-10">
              <button
                onClick={toggleTheme}
                className="px-2 py-1 bg-muted text-foreground rounded text-xs hover:bg-muted/80"
                title={`Switch to ${
                  themeMode === "light" ? "dark" : "light"
                } mode`}
              >
                {themeMode === "light" ? (
                  <GibbousMoonIcon className="h-3 w-3" />
                ) : (
                  <Sun03Icon className="h-3 w-3" />
                )}
              </button>
              <button
                onClick={openDrawio}
                className="px-2 py-1 bg-muted text-foreground rounded text-xs hover:bg-muted/80"
                title="Edit diagram"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-2 py-1 bg-destructive text-destructive-foreground rounded text-xs hover:bg-destructive/90"
                title="Delete diagram"
              >
                Delete
              </button>
            </div>
            <div
              className="drawio-svg-container flex justify-center items-center"
              style={{
                filter:
                  themeMode === "dark"
                    ? "invert(0.92) contrast(0.85) brightness(1.1) saturate(1.2)"
                    : "none",
              }}
              dangerouslySetInnerHTML={{ __html: node.attrs.svgData }}
            />
          </>
        ) : (
          <div className="text-center py-12">
            <button
              onClick={openDrawio}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Create Diagram
            </button>
            <button
              onClick={handleDelete}
              className="ml-2 px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const DrawioExtension = Node.create<{ drawioUrl?: string }>({
  name: "drawio",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return {
      drawioUrl: "https://embed.diagrams.net",
    };
  },

  addAttributes() {
    return {
      diagramData: {
        default: null,
        parseHTML: (element) =>
          element.getAttribute("data-drawio-data") || null,
        renderHTML: (attributes) => {
          if (!attributes.diagramData) return {};
          return {
            "data-drawio-data": attributes.diagramData,
          };
        },
      },
      svgData: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-drawio-svg") || null,
        renderHTML: (attributes) => {
          if (!attributes.svgData) return {};
          return {
            "data-drawio-svg": attributes.svgData,
          };
        },
      },
      themeMode: {
        default: "light",
        parseHTML: (element) =>
          element.getAttribute("data-drawio-theme") || "light",
        renderHTML: (attributes) => {
          return {
            "data-drawio-theme": attributes.themeMode || "light",
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-drawio]",
        getAttrs: (element) => ({
          diagramData:
            (element as HTMLElement).getAttribute("data-drawio-data") || null,
          svgData:
            (element as HTMLElement).getAttribute("data-drawio-svg") || null,
          themeMode:
            (element as HTMLElement).getAttribute("data-drawio-theme") ||
            "light",
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "div",
      mergeAttributes({
        "data-drawio": "",
        "data-drawio-data": node.attrs.diagramData || "",
        "data-drawio-svg": node.attrs.svgData || "",
        "data-drawio-theme": node.attrs.themeMode || "light",
      }),
      "[Draw.io Diagram]",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DrawioNodeView, {
      as: "div",
      contentDOMElementTag: "div",
    });
  },

  addStorage() {
    return {
      drawioUrl: this.options.drawioUrl,
    };
  },

  /** @ts-ignore */
  addCommands() {
    return {
      insertDrawIo:
        () =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: { diagramData: null, svgData: null },
          });
        },
    };
  },
});
