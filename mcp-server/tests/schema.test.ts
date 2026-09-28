import { describe, expect, it } from "bun:test";
import { toSpec } from "../src/jotty/spec.ts";
import { BodyMode, fillPath, splitArgs, toolInput } from "../src/tools/schema.ts";
import { toolNameOf } from "../src/tools/catalog.ts";
import { FAKE_SPEC } from "./helpers.ts";

const spec = toSpec(FAKE_SPEC);
const op = (id: string) => {
  const found = spec.operations.get(id);
  if (!found) throw new Error(`missing ${id}`);
  return found;
};

describe("toolInput", () => {
  it("flattens path, query and body into one object schema", () => {
    const { schema, layout } = toolInput(spec, op("createNote"));
    expect(Object.keys(schema.properties ?? {})).toEqual(["title", "category"]);
    expect(schema.required).toEqual(["title"]);
    expect(layout.body).toBe(BodyMode.Flat);
  });

  it("nests the body when a field clashes with a path param, and inlines refs", () => {
    const { schema, layout } = toolInput(spec, op("createTaskStatus"));
    expect(layout.body).toBe(BodyMode.Nested);
    expect(schema.required).toEqual(["taskId", "body"]);
    const body = schema.properties?.body;
    expect(body?.properties?.label).toEqual({ type: "string", description: "Shown on the column" });
  });

  it("splits arguments back into path, query and body", () => {
    const { layout } = toolInput(spec, op("createTaskStatus"));
    const parts = splitArgs(layout, { taskId: "t 1", body: { label: "Done" } });
    expect(parts).toEqual({ path: { taskId: "t 1" }, query: {}, body: { label: "Done" } });
    expect(fillPath("/tasks/{taskId}/statuses", parts.path)).toBe("/tasks/t%201/statuses");
  });

  it("stringifies query values and sends no body for reads", () => {
    const { layout } = toolInput(spec, op("listNotes"));
    expect(splitArgs(layout, { q: 5 })).toEqual({ path: {}, query: { q: "5" }, body: undefined });
  });
});

describe("toolNameOf", () => {
  it("snake cases operation ids", () => {
    expect(toolNameOf("uncheckChecklistItem")).toBe("uncheck_checklist_item");
  });
});
