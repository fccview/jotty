import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { ROUTE_MODULES } from "@/app/_server/api/route-index";
import { buildSpec, contractsOf, isApiHandler } from "@/app/_server/api/openapi";
import { apiNames } from "@/app/_schemas/api/names";
import { z } from "zod";

const API_DIR = path.join(process.cwd(), "app", "api");
const INDEX_FILE = path.join(process.cwd(), "app", "_server", "api", "route-index.ts");
const DEFINES = /define(Public)?Route\(/;

const routeFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(full);
    return entry.name === "route.ts" ? [full] : [];
  });

const contractPath = (file: string) =>
  "/" +
  path
    .relative(API_DIR, path.dirname(file))
    .split(path.sep)
    .map((segment) => segment.replace(/^\[(.+)\]$/, "{$1}"))
    .join("/");

const contracted = routeFiles(API_DIR).filter((file) =>
  DEFINES.test(fs.readFileSync(file, "utf8")),
);

describe("API route contracts", () => {
  it("lists every contracted route in the route index", () => {
    const index = fs.readFileSync(INDEX_FILE, "utf8");
    const missing = contracted
      .map((file) => `@/app/api/${path.relative(API_DIR, path.dirname(file)).split(path.sep).join("/")}/route`)
      .filter((spec) => !index.includes(`"${spec}"`));
    expect(missing).toEqual([]);
  });

  it.each(contracted.map((file) => [path.relative(API_DIR, file), file]))(
    "%s declares its own path and method",
    async (_label, file) => {
      const mod = await import(file);
      const handlers = Object.entries(mod).filter(([, value]) => isApiHandler(value));
      expect(handlers.length).toBeGreaterThan(0);
      handlers.forEach(([name, handler]) => {
        if (!isApiHandler(handler)) return;
        expect(handler.contract.path).toBe(contractPath(file));
        expect(handler.contract.method.toUpperCase()).toBe(name);
      });
    },
  );

  it("uses unique operation ids", () => {
    const ids = contractsOf(ROUTE_MODULES).map((contract) => contract.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it("builds an OpenAPI document with every contract", () => {
    const contracts = contractsOf(ROUTE_MODULES);
    const spec = buildSpec(contracts, { origin: "http://localhost:3000", version: "test" });
    const operations = Object.values(spec.paths).flatMap((ops) => Object.keys(ops));
    expect(operations.length).toBe(contracts.length);
    expect(JSON.stringify(spec)).not.toContain("#/$defs/");
  });

  it("lets a reloaded schema module register the same id again", () => {
    const first = z.object({ a: z.string() });
    const second = z.object({ b: z.string().describe("reloaded") });
    expect(() => {
      first.register(apiNames, { id: "Reloaded" });
      second.register(apiNames, { id: "Reloaded" });
    }).not.toThrow();
    expect(apiNames.get(second)).toMatchObject({ id: "Reloaded" });
    expect(apiNames.get(first)).toBeUndefined();
  });
});
