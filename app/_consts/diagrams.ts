export const DIAGRAM_DARK_FILTER = "invert(93%) hue-rotate(180deg)";

export const DEFAULT_DRAWIO_URL = "https://embed.diagrams.net";

export const DIAGRAM_PROXY_PATH = "/api/diagram-proxy";

export const EXCALIDRAW_ASSET_PATH = "/themes/excalidraw/";

export const EXCALIDRAW_STYLESHEET = `${EXCALIDRAW_ASSET_PATH}excalidraw.css`;

export const DEFAULT_MERMAID_DIAGRAM = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Option 1]
    B -->|No| D[Option 2]
    C --> E[End]
    D --> E`;

export enum ThemeTone {
  Light = "light",
  Dark = "dark",
}
