// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, createElement } from "react";
import { createRoot, Root } from "react-dom/client";
import { useServerItem } from "@/app/_hooks/useServerItem";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface Item {
  id: string;
  updatedAt: string;
  category: string;
  content: string;
}

type Api = ReturnType<typeof useServerItem<Item>>;
const probe: { api: Api | null } = { api: null };
let host: HTMLElement;
let root: Root;

const Probe = ({ item }: { item: Item }) => {
  probe.api = useServerItem(item);
  return null;
};

const show = (item: Item) =>
  act(() => {
    root.render(createElement(Probe, { item }));
  });

const local = (): Item => probe.api![0];

const served: Item = {
  id: "sharez-one",
  updatedAt: "2026-11-07T10:00:00.000Z",
  category: "ShareZ",
  content: "from disk",
};

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  probe.api = null;
});

describe("useServerItem", () => {
  it("picks up a renamed folder from the server without touching local edits", async () => {
    await show(served);
    await act(() => probe.api![1]((current) => ({ ...current, content: "typed locally" })));

    await show({ ...served, category: "ShareY" });

    expect(local()).toMatchObject({ category: "ShareY", content: "typed locally" });
  });

  it("follows a nested rename too", async () => {
    await show({ ...served, category: "Top/ShareZ" });

    await show({ ...served, category: "Bottom/ShareZ" });

    expect(local().category).toBe("Bottom/ShareZ");
  });

  it("takes the whole item when the server saved a newer version", async () => {
    await show(served);
    await act(() => probe.api![1]((current) => ({ ...current, content: "typed locally" })));

    const newer = { ...served, updatedAt: "2026-11-07T11:00:00.000Z", content: "saved elsewhere" };
    await show(newer);

    expect(local()).toEqual(newer);
  });

  it("leaves local state alone when a refresh changes nothing", async () => {
    await show(served);
    await act(() => probe.api![1]((current) => ({ ...current, content: "typed locally" })));

    await show({ ...served });

    expect(local()).toMatchObject({ category: "ShareZ", content: "typed locally" });
  });
});
