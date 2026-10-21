import { describe, it, expect } from "vitest";
import { QuickSettingId, accountPatch, accountValueOf, sliderOf } from "@/app/_consts/quick-settings";

const t = (key: string, values?: Record<string, string | number>) =>
  values ? `${key}:${JSON.stringify(values)}` : key;

describe("quick settings follow the account defaults", () => {
  it("reads a missing corner rounding as following the instance", () => {
    expect(accountValueOf(QuickSettingId.BORDER_RADIUS, {})).toBeNull();
    expect(accountValueOf(QuickSettingId.BORDER_RADIUS, { preferredBorderRadius: 1 })).toBe(1);
  });

  it("clears corner rounding instead of pinning the instance value", () => {
    expect(accountPatch(QuickSettingId.BORDER_RADIUS, null, { preferredBorderRadius: 1 })).toEqual({
      preferredBorderRadius: null,
    });
    expect(accountPatch(QuickSettingId.BORDER_RADIUS, 9, {})).toEqual({ preferredBorderRadius: 2 });
  });

  it("shows the admin radius as the default when nothing is saved", () => {
    const control = sliderOf(QuickSettingId.BORDER_RADIUS);

    expect(control?.fallback(0.75)).toBe(0.75);
    expect(control?.valueText(null, 0.75, t)).toContain("settings.defaultOption");
    expect(control?.valueText(1, 1, t)).toBe("1rem");
  });

  it("clears font size and column width defaults rather than storing auto", () => {
    expect(accountPatch(QuickSettingId.NOTE_FONT_SIZE, null, {})).toEqual({ notesFontSize: null });
    expect(accountPatch(QuickSettingId.KANBAN_COLUMN_WIDTH, null, {})).toEqual({ kanbanColumnWidth: null });
  });

  it("still reads the old stored auto values as default", () => {
    expect(accountValueOf(QuickSettingId.NOTE_FONT_SIZE, { notesFontSize: 0 })).toBeNull();
    expect(accountValueOf(QuickSettingId.KANBAN_COLUMN_WIDTH, { kanbanColumnWidth: 0 })).toBeNull();
    expect(accountValueOf(QuickSettingId.NOTE_FONT_SIZE, {})).toBeNull();
  });

  it("reads missing toggles and choices as their defaults", () => {
    expect(accountValueOf(QuickSettingId.CARD_PREVIEW, {})).toBe(false);
    expect(accountValueOf(QuickSettingId.SHOW_EMOJIS, {})).toBe(true);
    expect(accountValueOf(QuickSettingId.AUTOSAVE, {})).toBe(true);
    expect(accountValueOf(QuickSettingId.VIEW_MODE, {})).toBe("card");
    expect(accountValueOf(QuickSettingId.THEME, {})).toBe("system");
  });
});
