import type { JsonSchema } from "../jotty/openapi.ts";

export const MAX_CHARS = "maxChars";

export const budgetProp = (fallback: number): JsonSchema => ({
  type: "integer",
  minimum: 1,
  description: `Most characters of output for this call, ${fallback} when left out. Raise it to read a large result whole, lower it to save room`,
});

export const withBudget = (schema: JsonSchema, fallback: number): JsonSchema =>
  schema.properties?.[MAX_CHARS]
    ? schema
    : { ...schema, properties: { ...schema.properties, [MAX_CHARS]: budgetProp(fallback) } };

export const budgetOf = (args: Record<string, unknown>, fallback: number): number => {
  const asked = Number(args[MAX_CHARS]);
  return Number.isInteger(asked) && asked > 0 ? asked : fallback;
};

export const withoutBudget = (args: Record<string, unknown>): Record<string, unknown> => {
  const { [MAX_CHARS]: _budget, ...rest } = args;
  return rest;
};
