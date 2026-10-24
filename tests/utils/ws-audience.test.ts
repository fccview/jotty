import { describe, it, expect } from "vitest";
import { reachesUser } from "@/app/_utils/ws-audience";

describe("websocket audience", () => {
  it("delivers instance-wide events to everybody", () => {
    expect(reachesUser({}, "alice")).toBe(true);
    expect(reachesUser({}, undefined)).toBe(true);
  });

  it("delivers a private event only to that user's own sessions", () => {
    expect(reachesUser({ recipient: "alice" }, "alice")).toBe(true);
    expect(reachesUser({ recipient: "alice" }, "bob")).toBe(false);
    expect(reachesUser({ recipient: "alice" }, undefined)).toBe(false);
  });
});
