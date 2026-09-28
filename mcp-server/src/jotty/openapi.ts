export type JsonSchema = {
  $ref?: string;
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  description?: string;
  [keyword: string]: unknown;
};

export enum ParamLocation {
  Path = "path",
  Query = "query",
}

export interface SpecParameter {
  name: string;
  in: ParamLocation;
  required: boolean;
  description?: string;
  schema: JsonSchema;
}

export interface SpecOperation {
  operationId: string;
  summary: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  security?: unknown[];
  parameters?: SpecParameter[];
  requestBody?: { content: Record<string, { schema: JsonSchema }> };
}

export interface OpenApiDocument {
  info: { title: string; version: string };
  paths: Record<string, Record<string, SpecOperation>>;
  components?: { schemas?: Record<string, JsonSchema> };
}

export interface Operation extends SpecOperation {
  method: string;
  path: string;
}
