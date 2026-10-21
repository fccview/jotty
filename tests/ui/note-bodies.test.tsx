// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, createElement, useEffect } from "react";
import { createRoot, Root } from "react-dom/client";
import type { Note } from "@/app/_types";
import { RETRY_BASE_MS } from "@/app/_utils/browse/body-retry";

const mockRead = vi.fn();

vi.mock("@/app/_server/actions/note", () => ({
  readNoteBodies: (uuids: string[]) => mockRead(uuids),
}));

import { useNoteBodies } from "@/app/_hooks/browse/useNoteBodies";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const summary = (uuid: string): Note => ({
  id: uuid,
  uuid,
  title: uuid,
  content: "",
  excerpt: "short",
  createdAt: "",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const NOTES = [summary("a")];
const probe: { shown: Note[] } = { shown: [] };
let host: HTMLElement;
let root: Root;

const Probe = () => {
  const shown = useNoteBodies({ notes: NOTES, pageItems: NOTES, wanted: NOTES, upcoming: [], isActive: true });
  useEffect(() => {
    probe.shown = shown;
  });
  return null;
};

const tick = async (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

describe("useNoteBodies", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockRead.mockReset();
    host = document.createElement("div");
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    vi.useRealTimers();
  });

  it("retries a failed fetch after a backoff instead of giving up for the session", async () => {
    mockRead
      .mockResolvedValueOnce({ success: false, error: "flaky" })
      .mockResolvedValueOnce({ success: true, data: [{ uuid: "a", content: "full body" }] });
    vi.spyOn(console, "error").mockImplementation(() => {});

    await act(async () => root.render(createElement(Probe)));
    await tick(0);
    expect(mockRead).toHaveBeenCalledTimes(1);
    expect(probe.shown[0].content).toBe("");

    await tick(RETRY_BASE_MS / 2);
    expect(mockRead).toHaveBeenCalledTimes(1);

    await tick(RETRY_BASE_MS);
    expect(mockRead).toHaveBeenCalledTimes(2);
    expect(probe.shown[0].content).toBe("full body");
  });

  it("does not ask again after a successful answer that omitted the note", async () => {
    mockRead.mockResolvedValue({ success: true, data: [] });

    await act(async () => root.render(createElement(Probe)));
    await tick(RETRY_BASE_MS * 10);

    expect(mockRead).toHaveBeenCalledTimes(1);
  });
});
