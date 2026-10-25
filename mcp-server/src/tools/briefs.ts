import type { JsonSchema } from "../jotty/openapi.ts";

type Row = Record<string, unknown>;

export const VERBOSE = "verbose";

export type Brief = (data: Row, verbose: boolean) => unknown;

export const verboseProp: JsonSchema = {
  type: "boolean",
  description: "true returns every card in full. Left out, each card comes back as its id, externalId and status",
};

const cardRef = (card: unknown) => {
  const { id, externalId, status } = (card ?? {}) as Row;
  return { id, ...(externalId !== undefined && { externalId }), status };
};

export const cardsBrief: Brief = ({ success, created, updated, data, ...rest }, verbose) => ({
  success,
  created,
  updated,
  ...rest,
  cards: verbose || !Array.isArray(data) ? data : data.map(cardRef),
});

export const cardBrief: Brief = (data, verbose) =>
  verbose || !data.item ? data : { ...data, item: cardRef(data.item) };

export const withVerbose = (schema: JsonSchema): JsonSchema => ({
  ...schema,
  properties: { ...schema.properties, [VERBOSE]: verboseProp },
});

export const splitVerbose = (args: Record<string, unknown>, briefed: boolean) => {
  if (!briefed) return { verbose: false, rest: args };
  const { [VERBOSE]: verbose, ...rest } = args;
  return { verbose: verbose === true || verbose === "true", rest };
};
