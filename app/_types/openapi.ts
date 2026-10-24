export type JsonSchema = {
  $ref?: string;
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  const?: unknown;
  default?: unknown;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  description?: string;
  [keyword: string]: unknown;
};

export enum ParameterLocation {
  PATH = "path",
  QUERY = "query",
}

export interface SpecParameter {
  name: string;
  in: ParameterLocation;
  required: boolean;
  description?: string;
  schema: JsonSchema;
}

export interface SpecMedia {
  schema?: JsonSchema;
}

export interface SpecOperation {
  operationId: string;
  summary: string;
  description?: string;
  tags: string[];
  deprecated?: boolean;
  security?: Record<string, string[]>[];
  parameters: SpecParameter[];
  requestBody?: { required: boolean; content: Record<string, SpecMedia> };
  responses: Record<string, { description: string; content?: Record<string, SpecMedia> }>;
}

export interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers: { url: string }[];
  security: Record<string, string[]>[];
  tags: { name: string }[];
  paths: Record<string, Record<string, SpecOperation>>;
  components: {
    securitySchemes: Record<string, { type: string; in: string; name: string }>;
    schemas: Record<string, JsonSchema>;
  };
}
