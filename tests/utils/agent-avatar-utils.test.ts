import { describe, it, expect } from "vitest";
import {
  ROBOT_HUES,
  RobotAntennas,
  RobotEyes,
  RobotHeads,
  RobotMouths,
  avatarSeed,
  robotHash,
  robotLook,
} from "@/app/_utils/agent-avatar-utils";

const SPEC = "5b1e8a52-3c1d-4d7e-9f0a-1b2c3d4e5f60";
const BOARD = "0f6a3b2c-8d9e-4f10-a1b2-c3d4e5f60718";

describe("agent robot avatars", () => {
  it("hashes with 32-bit FNV-1a", () => {
    expect(robotHash("")).toBe(0x811c9dc5);
    expect(robotHash("a")).toBe(0xe40c292c);
    expect(robotHash("parser-bot")).toBe(robotHash("parser-bot"));
  });

  it("seeds from the spec note, falling back to the board", () => {
    expect(avatarSeed("parser-bot", BOARD, SPEC)).toBe(`${SPEC}:parser-bot`);
    expect(avatarSeed("parser-bot", BOARD, null)).toBe(`${BOARD}:parser-bot`);
    expect(avatarSeed("parser-bot", BOARD)).toBe(`${BOARD}:parser-bot`);
  });

  it("draws the same robot for the same seed every time", () => {
    const seed = avatarSeed("parser-bot", BOARD, SPEC);
    expect(robotLook(seed)).toEqual(robotLook(seed));
  });

  it("only uses known parts and palette hues", () => {
    for (let index = 0; index < 50; index++) {
      const look = robotLook(`${SPEC}:agent-${index}`);
      expect(ROBOT_HUES).toContain(look.hue);
      expect(Object.values(RobotHeads)).toContain(look.head);
      expect(Object.values(RobotEyes)).toContain(look.eyes);
      expect(Object.values(RobotMouths)).toContain(look.mouth);
      expect(Object.values(RobotAntennas)).toContain(look.antenna);
    }
  });

  it("gives different agents visibly different robots", () => {
    const looks = Array.from({ length: 60 }, (_, index) => robotLook(`${SPEC}:agent-${index}`));
    const faces = new Set(looks.map((look) => `${look.hue}|${look.head}|${look.eyes}|${look.mouth}|${look.antenna}|${look.ears}`));

    expect(faces.size).toBeGreaterThan(55);
    expect(new Set(looks.map((look) => look.hue)).size).toBeGreaterThan(8);
    expect(new Set(looks.map((look) => look.head)).size).toBe(Object.values(RobotHeads).length);
    expect(new Set(looks.map((look) => look.eyes)).size).toBe(Object.values(RobotEyes).length);
    expect(new Set(looks.map((look) => look.mouth)).size).toBe(Object.values(RobotMouths).length);
    expect(new Set(looks.map((look) => look.antenna)).size).toBe(Object.values(RobotAntennas).length);
  });

  it("changes the robot when the same agent moves to another spec", () => {
    const here = robotLook(avatarSeed("parser-bot", BOARD, SPEC));
    const there = robotLook(avatarSeed("parser-bot", BOARD, "11111111-2222-4333-8444-555555555555"));
    expect(here).not.toEqual(there);
  });
});
