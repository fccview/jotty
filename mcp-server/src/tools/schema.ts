import type { JsonSchema, Operation } from "../jotty/openapi.ts";
import { ParamLocation } from "../jotty/openapi.ts";
import type { Spec } from "../jotty/spec.ts";

const REF_PREFIX = "#/components/schemas/";
const MAX_REF_DEPTH = 3;
const BODY_KEY = "body";

export enum BodyMode {
  None = "none",
  Flat = "flat",
  Nested = "nested",
}

export interface ArgLayout {
  path: string[];
  query: string[];
  body: BodyMode;
}

export interface ToolInput {
  schema: JsonSchema;
  layout: ArgLayout;
}

export const inline = (spec: Spec, node: unknown, depth = 0): unknown => {
  if (Array.isArray(node)) return node.map((item) => inline(spec, item, depth));
  if (!node || typeof node !== "object") return node;
  const record = node as JsonSchema;
  if (typeof record.$ref === "string") {
    const target = spec.schemas[record.$ref.replace(REF_PREFIX, "")];
    return target && depth < MAX_REF_DEPTH ? inline(spec, target, depth + 1) : {};
  }
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, inline(spec, value, depth)]),
  );
};

const _bodyOf = (spec: Spec, op: Operation): JsonSchema | undefined => {
  const media = Object.values(op.requestBody?.content ?? {})[0];
  return media ? (inline(spec, media.schema) as JsonSchema) : undefined;
};

const _names = (op: Operation, where: ParamLocation): string[] =>
  (op.parameters ?? []).filter((param) => param.in === where).map((param) => param.name);

export const toolInput = (spec: Spec, op: Operation): ToolInput => {
  const params = op.parameters ?? [];
  const properties: Record<string, JsonSchema> = {};
  const required: string[] = [];

  params.forEach((param) => {
    properties[param.name] = {
      ...(inline(spec, param.schema) as JsonSchema),
      ...(param.description ? { description: param.description } : {}),
    };
    if (param.required) required.push(param.name);
  });

  const body = _bodyOf(spec, op);
  const bodyProps = body?.properties ?? {};
  const clashes = Object.keys(bodyProps).some((name) => name in properties);
  const mode = !body ? BodyMode.None : clashes || body.type !== "object" ? BodyMode.Nested : BodyMode.Flat;

  if (mode === BodyMode.Flat) {
    Object.assign(properties, bodyProps);
    required.push(...(body?.required ?? []));
  }
  if (mode === BodyMode.Nested && body) {
    properties[BODY_KEY] = body;
    required.push(BODY_KEY);
  }

  return {
    schema: { type: "object", properties, ...(required.length ? { required } : {}) },
    layout: {
      path: _names(op, ParamLocation.Path),
      query: _names(op, ParamLocation.Query),
      body: mode,
    },
  };
};

const _pick = (args: Record<string, unknown>, names: string[]) =>
  Object.fromEntries(names.filter((name) => args[name] !== undefined).map((name) => [name, args[name]]));

export const splitArgs = (layout: ArgLayout, args: Record<string, unknown>) => {
  const taken = new Set([...layout.path, ...layout.query]);
  const rest = Object.fromEntries(Object.entries(args).filter(([name]) => !taken.has(name)));
  return {
    path: _pick(args, layout.path),
    query: Object.fromEntries(
      Object.entries(_pick(args, layout.query)).map(([name, value]) => [name, String(value)]),
    ),
    body:
      layout.body === BodyMode.None
        ? undefined
        : layout.body === BodyMode.Nested
          ? (args[BODY_KEY] ?? {})
          : rest,
  };
};

export const fillPath = (template: string, values: Record<string, unknown>): string =>
  template.replace(/\{([^}]+)\}/g, (_, name: string) =>
    encodeURIComponent(String(values[name] ?? "")),
  );
