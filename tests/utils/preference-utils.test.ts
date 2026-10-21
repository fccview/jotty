import { describe, it, expect } from "vitest";
import {
  DEFAULT_OPTION_ID,
  applyPatch,
  mergeIncoming,
  optionFromRaw,
  storedSettingsOf,
  withDefaultOption,
} from "@/app/_utils/settings/preference-utils";
import { SETTING_DEFAULTS } from "@/app/_consts/user-settings";
import { User } from "@/app/_types";

const OPTIONS = [
  { id: 0, name: "Off" },
  { id: 5000, name: "5s" },
];

describe("preference defaults", () => {
  it("puts a Default choice first and maps it to clearing", () => {
    const choices = withDefaultOption(OPTIONS, "Default (5s)");

    expect(choices[0]).toEqual({ id: DEFAULT_OPTION_ID, name: "Default (5s)" });
    expect(optionFromRaw(OPTIONS, DEFAULT_OPTION_ID)).toBeNull();
    expect(optionFromRaw(OPTIONS, "5000")).toBe(5000);
    expect(optionFromRaw(OPTIONS, "0")).toBe(0);
  });

  it("keeps explicit values from old records, including ones equal to the default", () => {
    const stored = storedSettingsOf({
      username: "alice",
      notesDefaultMode: "view",
      handedness: "left-handed",
      notesAutoSaveInterval: 0,
    } as User);

    expect(stored).toEqual({ notesDefaultMode: "view", handedness: "left-handed", notesAutoSaveInterval: 0 });
  });

  it("reads old auto sentinels and empty category as default", () => {
    const stored = storedSettingsOf({
      username: "alice",
      notesFontSize: 0,
      kanbanColumnWidth: 0,
      quickCreateNotesCategory: "",
    } as User);

    expect(stored).toEqual({});
  });

  it("never carries non-editable fields into the form", () => {
    const stored = storedSettingsOf({ username: "alice", isAdmin: true, passwordHash: "x" } as User);

    expect(stored).toEqual({});
  });

  it("removes a cleared key and sets the rest", () => {
    expect(applyPatch({ handedness: "left-handed" }, { handedness: null, landingPage: SETTING_DEFAULTS.landingPage })).toEqual({
      landingPage: SETTING_DEFAULTS.landingPage,
    });
  });

  it("takes the server copy except where a local edit is still in flight", () => {
    const merged = mergeIncoming(
      { handedness: "right-handed", tableSyntax: "html" },
      { handedness: "left-handed" },
      (key) => key === "handedness" || key === "tableSyntax",
    );

    expect(merged).toEqual({ handedness: "left-handed" });
  });
});
