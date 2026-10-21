// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, ReactElement, useState } from "react";
import { createRoot, Root } from "react-dom/client";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const SLIDE_MS = 320;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLElement;
let root: Root;

const render = async (node: ReactElement) => {
  await act(async () => root.render(node));
  await act(async () => {
    vi.advanceTimersByTime(50);
  });
};

const pressEscape = async () =>
  act(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });

const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
const wrapper = () => dialog()?.parentElement ?? null;

const Stubborn = ({ onClose }: { onClose: () => void }) => (
  <Modal isOpen onClose={onClose} title="Editor">
    <textarea />
  </Modal>
);

const Flipping = ({ onClose }: { onClose: () => void }) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setIsOpen(false);
      }}
      title="Flip"
    >
      body
    </Modal>
  );
};

const Unmounting = () => {
  const [isOpen, setIsOpen] = useState(true);
  return isOpen ? (
    <Modal isOpen onClose={() => setIsOpen(false)} title="Gone">
      body
    </Modal>
  ) : null;
};

describe("Modal close", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"] });
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    document.getElementById("modal-portal-root")?.replaceChildren();
    vi.useRealTimers();
  });

  it("asks the parent first and stays visible when the parent keeps it open", async () => {
    const onClose = vi.fn();
    await render(<Stubborn onClose={onClose} />);

    await pressEscape();
    await act(async () => {
      vi.advanceTimersByTime(SLIDE_MS * 2);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dialog()).not.toBeNull();
    expect(wrapper()?.className).not.toContain("pointer-events-none");
    expect(dialog()?.className).toContain("opacity-100");
  });

  it("slides out and unmounts once the parent flips isOpen off", async () => {
    const onClose = vi.fn();
    await render(<Flipping onClose={onClose} />);

    await pressEscape();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dialog()?.className).toContain("opacity-0");
    expect(dialog()).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(SLIDE_MS + 10);
    });
    expect(dialog()).toBeNull();
  });

  it("plays a ghost exit when the parent unmounts it straight away", async () => {
    await render(<Unmounting />);

    await pressEscape();

    const ghost = document.querySelector<HTMLElement>("#modal-portal-root [inert]");
    expect(ghost).not.toBeNull();
    expect(ghost?.getAttribute("aria-hidden")).toBe("true");

    await act(async () => {
      vi.advanceTimersByTime(SLIDE_MS + 10);
    });
    expect(document.querySelector("#modal-portal-root [inert]")).toBeNull();
  });

  it("lets content keep Escape when asked", async () => {
    const onClose = vi.fn();
    await render(
      <Modal isOpen onClose={onClose} title="Draw" closeOnEscape={false}>
        canvas
      </Modal>,
    );

    await pressEscape();

    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not steal focus from an autofocused field and returns it to the opener", async () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();

    const Host = () => {
      const [isOpen, setIsOpen] = useState(true);
      return isOpen ? (
        <Modal isOpen onClose={() => setIsOpen(false)} title="Ask">
          <input autoFocus data-field="yes" />
        </Modal>
      ) : null;
    };
    await render(<Host />);

    expect(document.activeElement?.getAttribute("data-field")).toBe("yes");

    await pressEscape();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("falls back to an element still on the page when the opener is gone", async () => {
    const trigger = document.createElement("button");
    const menuItem = document.createElement("button");
    document.body.append(trigger, menuItem);
    trigger.focus();
    menuItem.focus();

    const Host = () => {
      const [isOpen, setIsOpen] = useState(true);
      return isOpen ? (
        <Modal isOpen onClose={() => setIsOpen(false)} title="Menu">
          x
        </Modal>
      ) : null;
    };
    await render(<Host />);
    menuItem.remove();

    await pressEscape();
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });
});
