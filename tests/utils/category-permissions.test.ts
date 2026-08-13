import { describe, it, expect } from "vitest";
import { canFill, granted } from "@/app/_utils/sharing-utils";
import { PermissionTypes } from "@/app/_types/enums";

const SHARED_FOLDER = {
  sharedFrom: "el_capitan",
};

describe("category fill permission", () => {
  it("lets an owned category take new and moved items", () => {
    expect(canFill({})).toBe(true);
  });

  it("never lets a loose mount take items", () => {
    expect(canFill({ isLoose: true })).toBe(false);
    expect(
      canFill({ isLoose: true, permissions: { canRead: true, canEdit: true, canCreate: true } }),
    ).toBe(false);
  });

  it("blocks a shared folder that grants edit but not create", () => {
    expect(
      canFill({
        ...SHARED_FOLDER,
        permissions: { canRead: true, canEdit: true, canCreate: false },
      }),
    ).toBe(false);
  });

  it("allows a shared folder that grants create", () => {
    expect(
      canFill({
        ...SHARED_FOLDER,
        permissions: { canRead: true, canEdit: false, canCreate: true },
      }),
    ).toBe(true);
  });

  it("falls back to edit for grants written before create existed", () => {
    expect(
      canFill({ ...SHARED_FOLDER, permissions: { canRead: true, canEdit: true } }),
    ).toBe(true);
    expect(
      canFill({ ...SHARED_FOLDER, permissions: { canRead: true, canEdit: false } }),
    ).toBe(false);
    expect(granted({ canRead: true, canEdit: true }, PermissionTypes.CREATE)).toBe(true);
  });

  it("refuses a shared folder with no grant at all", () => {
    expect(canFill(SHARED_FOLDER)).toBe(false);
    expect(granted(undefined, PermissionTypes.CREATE)).toBe(false);
  });
});
