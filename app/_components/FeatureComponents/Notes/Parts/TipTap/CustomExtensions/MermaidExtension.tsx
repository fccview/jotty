"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

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

export const MermaidNodeView = ({ node, updateAttributes, deleteNode }: any) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(node.attrs.content || "");

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !node.attrs.content || isEditing) return;

      try {
        initializeMermaidTheme();

        setError(null);
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        const { svg } = await mermaid.render(id, node.attrs.content);
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
  }, [node.attrs.content, isEditing]);

  const handleSave = () => {
    updateAttributes({ content: editContent });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(node.attrs.content || "");
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm("Delete this diagram?")) {
      deleteNode();
    }
  };

  return (
    <NodeViewWrapper className="mermaid-node-wrapper">
      <div className="mermaid-diagram-container relative group border border-border rounded-md p-4 my-4 bg-background">
        {isEditing ? (
          <div className="mermaid-editor">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full min-h-[200px] p-3 border border-border rounded font-mono text-sm bg-muted"
              placeholder="Enter Mermaid diagram code..."
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSave}
                className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1 bg-muted text-foreground rounded text-sm hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1 bg-destructive text-destructive-foreground rounded text-sm hover:bg-destructive/90 ml-auto"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 flex gap-1">
              <button
                onClick={() => setIsEditing(true)}
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
            {error ? (
              <div className="text-destructive text-sm p-3 bg-destructive/10 rounded border border-destructive">
                <div className="font-semibold mb-1">Mermaid Error:</div>
                <div className="font-mono text-xs">{error}</div>
              </div>
            ) : (
              <div
                ref={containerRef}
                className="mermaid-diagram flex justify-center items-center"
              />
            )}
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const MermaidExtension = Node.create({
  name: "mermaid",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      content: {
        default: "",
        parseHTML: (element) =>
          element.getAttribute("data-mermaid-content") || "",
        renderHTML: (attributes) => {
          if (!attributes.content) return {};
          return {
            "data-mermaid-content": attributes.content,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-mermaid]",
        getAttrs: (element) => ({
          content: (element as HTMLElement).getAttribute("data-mermaid-content") || "",
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "div",
      mergeAttributes({
        "data-mermaid": "",
        "data-mermaid-content": node.attrs.content,
      }),
      "[Mermaid Diagram]",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView);
  },

  /** @ts-ignore */
  addCommands() {
    return {
      setMermaid:
        (content: string) =>
          ({ commands }: any) => {
            return commands.insertContent({
              type: this.name,
              attrs: { content },
            });
          },
    };
  },
});
