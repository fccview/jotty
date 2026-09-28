import {
  JsonSchema,
  OpenApiDocument,
  ParameterLocation,
  SpecOperation,
  SpecParameter,
} from "@/app/_types/openapi";

export type ExplorerSpec = OpenApiDocument;

export interface Operation extends SpecOperation {
  method: string;
  path: string;
  isPublic: boolean;
}

export enum ExplorerMethod {
  GET = "get",
  POST = "post",
  PUT = "put",
  PATCH = "patch",
  DELETE = "delete",
}

const METHOD_ORDER: string[] = Object.values(ExplorerMethod);

const _byMethod = ([a]: [string, unknown], [b]: [string, unknown]) =>
  METHOD_ORDER.indexOf(a) - METHOD_ORDER.indexOf(b);

export const operationsOf = (spec: ExplorerSpec): Operation[] =>
  Object.entries(spec.paths).flatMap(([path, methods]) =>
    Object.entries(methods)
      .sort(_byMethod)
      .map(([method, op]) => ({
        ...op,
        method,
        path,
        isPublic: Array.isArray(op.security) && op.security.length === 0,
      })),
  );

const REF_PREFIX = "#/components/schemas/";
const MAX_DEPTH = 4;



export const groupByTag = (operations: Operation[]) =>
  operations.reduce<Record<string, Operation[]>>((groups, op) => {
    const tag = op.tags[0] ?? "";
    groups[tag] = [...(groups[tag] ?? []), op];
    return groups;
  }, {});

export const resolve = (spec: ExplorerSpec, schema?: JsonSchema): JsonSchema =>
  schema?.$ref
    ? resolve(spec, spec.components.schemas[schema.$ref.replace(REF_PREFIX, "")])
    : schema ?? {};

const _firstType = (schema: JsonSchema) =>
  Array.isArray(schema.type) ? schema.type[0] : schema.type;

export const sampleOf = (spec: ExplorerSpec, raw?: JsonSchema, depth = 0): unknown => {
  const schema = resolve(spec, raw);
  if (schema.default !== undefined) return schema.default;
  if (schema.const !== undefined) return schema.const;
  if (schema.enum?.length) return schema.enum[0];
  const variant = schema.anyOf?.[0] ?? schema.oneOf?.[0];
  if (variant) return sampleOf(spec, variant, depth);
  if (depth > MAX_DEPTH) return null;

  switch (_firstType(schema)) {
    case "object":
      return Object.fromEntries(
        Object.entries(schema.properties ?? {})
          .filter(([key]) => depth === 0 || schema.required?.includes(key))
          .map(([key, prop]) => [key, sampleOf(spec, prop, depth + 1)]),
      );
    case "array":
      return [];
    case "number":
    case "integer":
      return 0;
    case "boolean":
      return false;
    case "string":
      return "";
    default:
      return null;
  }
};

export const bodySchemaOf = (op: Operation) =>
  op.requestBody ? Object.values(op.requestBody.content)[0]?.schema : undefined;

export const buildUrl = (
  base: string,
  path: string,
  values: Record<string, string>,
  params: SpecParameter[],
) => {
  const filled = params
    .filter((param) => param.in === ParameterLocation.PATH)
    .reduce(
      (acc, param) =>
        acc.replace(`{${param.name}}`, encodeURIComponent(values[param.name] ?? "")),
      path,
    );
  const query = new URLSearchParams(
    params
      .filter((param) => param.in === ParameterLocation.QUERY && values[param.name])
      .map((param) => [param.name, values[param.name]]),
  ).toString();
  return `${base}${filled}${query ? `?${query}` : ""}`;
};

export const pretty = (text: string) => {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
};
