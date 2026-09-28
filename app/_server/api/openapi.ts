import { z } from "zod";
import { API_KEY_HEADER } from "@/app/_consts/api";
import { apiNames } from "@/app/_schemas/api/names";
import {
  JsonSchema,
  OpenApiDocument,
  ParameterLocation,
  SpecOperation,
  SpecParameter,
} from "@/app/_types/openapi";
import { AnyContract, ApiHandler, MediaType, ResponseBody, ResponseSpec, RouteAuth } from "./contract";

type Io = "input" | "output";
type Convert = (schema: z.ZodType, io: Io) => JsonSchema;

const API_KEY_SCHEME = "apiKey";
const DEFS_REF = "#/$defs/";
const COMPONENTS_REF = "#/components/schemas/";

export const isApiHandler = (value: unknown): value is ApiHandler =>
  typeof value === "function" && "contract" in value;

export const contractsOf = (modules: object[]): AnyContract[] =>
  modules.flatMap((mod) =>
    Object.values(mod)
      .filter(isApiHandler)
      .map((handler) => handler.contract),
  );

const _isNoise = (key: string, value: unknown) =>
  (key === "additionalProperties" && value === false) ||
  (key === "id" && typeof value === "string");

const _relink = (node: unknown): unknown => {
  if (Array.isArray(node)) return node.map(_relink);
  if (!node || typeof node !== "object") return node;
  return Object.fromEntries(
    Object.entries(node)
      .filter(([key, value]) => !_isNoise(key, value))
      .map(([key, value]) => [
        key,
        key === "$ref" && typeof value === "string"
          ? value.replace(DEFS_REF, COMPONENTS_REF)
          : _relink(value),
      ]),
  );
};

const _clean = (node: unknown) => _relink(node) as JsonSchema;

const _converter = (components: Record<string, JsonSchema>): Convert => (schema, io) => {
  const { $schema, $defs, ...json } = z.toJSONSchema(schema, {
    io,
    metadata: apiNames,
    unrepresentable: "any",
  });
  Object.entries($defs ?? {}).forEach(([id, def]) => {
    components[id] ??= _clean(def);
  });
  if (typeof json.id !== "string") return _clean(json);
  components[json.id] ??= _clean(json);
  return { $ref: `${COMPONENTS_REF}${json.id}` };
};

const _parameters = (convert: Convert, where: ParameterLocation, schema?: z.ZodType): SpecParameter[] => {
  if (!schema) return [];
  const json = convert(schema, "input");
  const required = new Set(json.required ?? []);
  return Object.entries(json.properties ?? {}).map(([name, prop]) => ({
    name,
    in: where,
    required: where === ParameterLocation.PATH || required.has(name),
    ...(prop.description ? { description: prop.description } : {}),
    schema: prop,
  }));
};

const _content = (spec: ResponseSpec, convert: Convert) => {
  const bodies: ResponseBody[] = [
    ...(spec.schema ? [{ mediaType: spec.mediaType ?? MediaType.JSON, schema: spec.schema }] : []),
    ...(spec.alternatives ?? []),
  ];
  if (!bodies.length) return {};
  return {
    content: Object.fromEntries(
      bodies.map(({ mediaType, schema }) => [mediaType, schema ? { schema: convert(schema, "output") } : {}]),
    ),
  };
};

const _operation = (contract: AnyContract, convert: Convert): SpecOperation => ({
  operationId: contract.id,
  summary: contract.summary,
  ...(contract.description ? { description: contract.description } : {}),
  tags: [contract.tag],
  ...(contract.deprecated ? { deprecated: true } : {}),
  ...(contract.auth === RouteAuth.PUBLIC ? { security: [] } : {}),
  parameters: [
    ..._parameters(convert, ParameterLocation.PATH, contract.params),
    ..._parameters(convert, ParameterLocation.QUERY, contract.query),
  ],
  ...(contract.body
    ? {
        requestBody: {
          required: true,
          content: { [MediaType.JSON]: { schema: convert(contract.body, "input") } },
        },
      }
    : {}),
  responses: Object.fromEntries(
    Object.entries(contract.responses).map(([status, spec]) => [
      status,
      { description: spec.description, ..._content(spec, convert) },
    ]),
  ),
});

export interface SpecOptions {
  origin: string;
  version: string;
}

export const buildSpec = (contracts: AnyContract[], { origin, version }: SpecOptions): OpenApiDocument => {
  const schemas: Record<string, JsonSchema> = {};
  const convert = _converter(schemas);
  const paths: OpenApiDocument["paths"] = {};

  contracts.forEach((contract) => {
    paths[contract.path] ??= {};
    paths[contract.path][contract.method] = _operation(contract, convert);
  });

  return {
    openapi: "3.1.0",
    info: {
      title: "Jotty API",
      version,
      description: "REST API for notes, checklists, tasks and Kanban boards. Every request acts as the user who owns the API key.",
    },
    servers: [{ url: `${origin}/api` }],
    security: [{ [API_KEY_SCHEME]: [] }],
    tags: Array.from(new Set(contracts.map((contract) => contract.tag))).map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: {
        [API_KEY_SCHEME]: { type: "apiKey", in: "header", name: API_KEY_HEADER },
      },
      schemas,
    },
  };
};
