// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, createElement, useEffect } from "react";
import { createRoot, Root } from "react-dom/client";
import type { SanitisedUser, UserSettingsPatch } from "@/app/_types";

const mockUpdate = vi.fn();
const mockSetUser = vi.fn();
const mockToast = vi.fn();
let mockUser: SanitisedUser | null = null;

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/_providers/AppModeProvider", () => ({
  useAppMode: () => ({ user: mockUser, setUser: mockSetUser }),
}));
vi.mock("@/app/_providers/ToastProvider", () => ({ useToast: () => ({ showToast: mockToast }) }));
vi.mock("@/app/_server/actions/users", () => ({
  updateUserSettings: (patch: UserSettingsPatch) => mockUpdate(patch),
}));

import { usePreferenceSettings } from "@/app/_hooks/settings/usePreferenceSettings";
import { QuickSettingId } from "@/app/_consts/quick-settings";
import { Modes } from "@/app/_types/enums";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Api = ReturnType<typeof usePreferenceSettings>;
const probe: { api: Api | null } = { api: null };
let host: HTMLElement;
let root: Root;

const Probe = () => {
  const api = usePreferenceSettings();
  useEffect(() => {
    probe.api = api;
  });
  return null;
};

const api = () => probe.api as Api;

const userWith = (extra: Partial<SanitisedUser>): SanitisedUser =>
  ({ username: "alice", isAdmin: false, ...extra }) as SanitisedUser;

const mount = async () => act(async () => root.render(createElement(Probe)));

const flush = async () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => (resolve = done));
  return { promise, resolve };
};

describe("usePreferenceSettings", () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    mockSetUser.mockReset();
    mockToast.mockReset();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
  });

  it("clears a field by sending null and shows it as default", async () => {
    mockUser = userWith({ handedness: "left-handed" });
    mockUpdate.mockResolvedValue({ success: true, data: { user: userWith({}) } });
    await mount();

    await act(async () => api().change("handedness", null));
    await flush();

    expect(mockUpdate).toHaveBeenCalledWith({ handedness: null });
    expect(api().current.handedness).toBeUndefined();
  });

  it("restores the saved value everywhere after a rejected save, so the same value can be saved again", async () => {
    mockUser = userWith({ handedness: "right-handed" });
    mockUpdate.mockResolvedValueOnce({ success: false, error: "nope" });
    await mount();

    await act(async () => api().change("handedness", "left-handed"));
    await flush();
    expect(api().current.handedness).toBe("right-handed");

    mockUpdate.mockResolvedValueOnce({ success: true, data: { user: userWith({ handedness: "left-handed" }) } });
    await act(async () => api().change("handedness", "left-handed"));
    await flush();

    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(api().current.handedness).toBe("left-handed");
  });

  it("keeps a value whose save is still queued when a refresh brings older data", async () => {
    mockUser = userWith({ handedness: "right-handed" });
    const pending = deferred<unknown>();
    mockUpdate.mockReturnValue(pending.promise);
    await mount();

    await act(async () => api().change("handedness", "left-handed"));

    mockUser = userWith({ handedness: "right-handed", tableSyntax: "html" });
    await mount();

    expect(api().current.handedness).toBe("left-handed");
    expect(api().current.tableSyntax).toBe("html");

    pending.resolve({ success: true, data: { user: userWith({ handedness: "left-handed" }) } });
    await flush();
  });

  it("takes changes saved by another session for fields nobody is editing", async () => {
    mockUser = userWith({ landingPage: Modes.NOTES });
    await mount();

    mockUser = userWith({ landingPage: "last-visited" });
    await mount();

    expect(api().current.landingPage).toBe("last-visited");
  });

  it("does not let a refresh reset a slider that is mid-drag", async () => {
    mockUser = userWith({ notesFontSize: 16 });
    await mount();

    await act(async () => api().slide(QuickSettingId.NOTE_FONT_SIZE, 20));
    mockUser = userWith({ notesFontSize: 16, handedness: "left-handed" });
    await mount();

    expect(api().current.notesFontSize).toBe(20);
    expect(api().current.handedness).toBe("left-handed");
  });
});
