// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { usePrismTheme } from "@/app/_hooks/usePrismThemes";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LINK = "prism-theme-stylesheet";

const Themed = () => {
  usePrismTheme("prism-okaidia");
  return null;
};

const Both = ({ editor }: { editor: boolean }) => (
  <>
    <Themed />
    {editor && <Themed />}
  </>
);

let host: HTMLElement;
let root: Root;

const themeLink = () => document.getElementById(LINK);

describe("usePrismTheme", () => {
  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
  });

  it("keeps the theme while another component still uses it", async () => {
    await act(async () => root.render(<Both editor />));
    expect(themeLink()?.getAttribute("data-prism-theme")).toBe("prism-okaidia");

    await act(async () => root.render(<Both editor={false} />));
    expect(themeLink()).not.toBeNull();
    expect(document.querySelectorAll(`#${LINK}`)).toHaveLength(1);
  });

  it("removes the theme once nothing uses it", async () => {
    await act(async () => root.render(<Both editor />));
    await act(async () => root.unmount());
    root = createRoot(host);

    expect(themeLink()).toBeNull();
  });
});
