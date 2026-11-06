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
const planted: HTMLElement[] = [];

const plant = <T extends HTMLElement>(node: T): T => {
  document.body.appendChild(node);
  planted.push(node);
  return node;
};

const pressTab = async (target: HTMLElement, shiftKey = false) => {
  const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true });
  await act(async () => {
    target.dispatchEvent(event);
  });
  return event;
};

const Drawing = () => (
  <Modal isOpen onClose={() => undefined} title="Draw" closeOnEscape={false}>
    <button>first</button>
    <button>last</button>
  </Modal>
);

const excalidrawDialog = () => {
  const dialog = document.createElement("div");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  const content = document.createElement("div");
  content.tabIndex = 0;
  const island = document.createElement("div");
  const field = document.createElement("textarea");
  const insert = document.createElement("button");
  island.append(field, insert);
  content.appendChild(island);
  dialog.appendChild(content);
  return { dialog: plant(dialog), content, field, insert };
};

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
const dialogPanel = () => document.querySelector<HTMLElement>('#modal-portal-root [role="dialog"]');
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

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"] });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  planted.splice(0).forEach((node) => node.remove());
  document.getElementById("modal-portal-root")?.replaceChildren();
  vi.useRealTimers();
});

describe("Modal close", () => {
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

describe("Modal focus trap", () => {
  it("leaves Tab alone inside a third-party dialog stacked on top", async () => {
    await render(<Drawing />);
    const { field } = excalidrawDialog();
    field.focus();

    const tab = await pressTab(field);

    expect(tab.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(field);
  });

  it("sends focus that slipped behind a stacked dialog back into it", async () => {
    await render(<Drawing />);
    const { dialog, content, insert } = excalidrawDialog();
    content.focus();

    const back = await pressTab(content, true);
    expect(back.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(insert);

    const panelButton = dialogPanel()!.querySelector("button")!;
    panelButton.focus();
    const tab = await pressTab(panelButton);
    expect(tab.defaultPrevented).toBe(true);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("ignores a dialog that was already open underneath", async () => {
    const { dialog, field } = excalidrawDialog();
    document.body.prepend(dialog);
    await render(<Drawing />);
    field.focus();

    const tab = await pressTab(field);

    expect(tab.defaultPrevented).toBe(true);
    expect(dialogPanel()?.contains(document.activeElement)).toBe(true);
  });

  it("still pulls stray focus back into the panel", async () => {
    await render(<Drawing />);
    const stray = plant(document.createElement("button"));
    stray.focus();

    const tab = await pressTab(stray);

    expect(tab.defaultPrevented).toBe(true);
    expect(dialogPanel()?.contains(document.activeElement)).toBe(true);
  });
});
