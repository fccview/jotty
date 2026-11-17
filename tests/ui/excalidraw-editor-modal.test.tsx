// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createPortal } from "react-dom";
import { createRoot, Root } from "react-dom/client";
import { ExcalidrawEditorModal } from "@/app/_components/FeatureComponents/Notes/Parts/Diagrams/ExcalidrawEditorModal";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/app/_providers/ToastProvider", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("@/app/_hooks/useThemeTone", () => ({
  useThemeTone: () => ({ tone: "light" }),
}));

vi.mock("@/app/_components/FeatureComponents/Notes/Parts/Diagrams/excalidraw-loader", () => ({
  pickLangCode: () => "en",
  loadExcalidraw: async () => ({
    THEME: { DARK: "dark", LIGHT: "light" },
    languages: [{ code: "en" }],
    Excalidraw: () => (
      <>
        <textarea data-canvas="yes" />
        {createPortal(
          <div role="dialog" aria-modal="true">
            <textarea data-mermaid="yes" />
          </div>,
          document.body,
        )}
      </>
    ),
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLElement;
let root: Root;

const pressSubmit = async (target: Element) =>
  act(async () => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", metaKey: true, bubbles: true, cancelable: true }),
    );
  });

const mount = async (onClose: () => void) => {
  await act(async () => root.render(<ExcalidrawEditorModal diagramData={null} onSave={vi.fn()} onClose={onClose} />));
  await act(async () => {
    await vi.waitFor(() => {
      if (!document.querySelector("[data-mermaid]")) throw new Error("excalidraw not loaded yet");
    });
  });
};

describe("Excalidraw editor shortcuts", () => {
  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    document.getElementById("modal-portal-root")?.replaceChildren();
  });

  it("leaves Cmd+Enter to the mermaid dialog instead of closing the editor", async () => {
    const onClose = vi.fn();
    await mount(onClose);

    await pressSubmit(document.querySelector("[data-mermaid]")!);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("still closes the editor on Cmd+Enter from the canvas", async () => {
    const onClose = vi.fn();
    await mount(onClose);

    await pressSubmit(document.querySelector("[data-canvas]")!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
