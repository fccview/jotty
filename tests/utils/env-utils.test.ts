import { describe, it, expect, afterEach, vi } from "vitest";
import { clusterNode } from "@/app/_utils/env-utils";

describe("clusterNode", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([undefined, "", "   "])("is off when JOTTY_NODE is %j", (value) => {
    vi.stubEnv("JOTTY_NODE", value);
    expect(clusterNode()).toBeUndefined();
  });

  it.each(["node1", "eu-west_2", " node2 "])("accepts %j", (value) => {
    vi.stubEnv("JOTTY_NODE", value);
    expect(clusterNode()).toBe(value.trim());
  });

  it.each(["../users", "node/1", "node 1", "a".repeat(65)])("refuses %j", (value) => {
    vi.stubEnv("JOTTY_NODE", value);
    expect(() => clusterNode()).toThrow("JOTTY_NODE");
  });
});
