import { JottyError, type JottyClient } from "./client.ts";
import type { OpenApiDocument, Operation } from "./openapi.ts";

const SPEC_PATH = "/openapi.json";
export const OPENAPI_SINCE = "1.28.0";

export class SpecMissingError extends Error {
  constructor() {
    super(`This Jotty has no /api${SPEC_PATH}, the MCP server needs Jotty ${OPENAPI_SINCE} or newer.`);
    this.name = "SpecMissingError";
  }
}

const _fetchSpec = (client: JottyClient, signal?: AbortSignal) =>
  client.send({ method: "get", path: SPEC_PATH, signal }).catch((err: unknown) => {
    throw err instanceof JottyError && err.status === 404 ? new SpecMissingError() : err;
  });

export interface Spec {
  version: string;
  operations: Map<string, Operation>;
  schemas: NonNullable<NonNullable<OpenApiDocument["components"]>["schemas"]>;
}

export interface SpecSource {
  load: (client: JottyClient, signal?: AbortSignal) => Promise<Spec>;
}

export const toSpec = (doc: OpenApiDocument): Spec => ({
  version: doc.info.version,
  schemas: doc.components?.schemas ?? {},
  operations: new Map(
    Object.entries(doc.paths).flatMap(([path, methods]) =>
      Object.entries(methods).map(([method, op]): [string, Operation] => [
        op.operationId,
        { ...op, method, path },
      ]),
    ),
  ),
});

export const createSpecSource = (ttlMs: number): SpecSource => {
  const cache = new Map<string, { spec: Spec; at: number }>();

  return {
    load: async (client, signal) => {
      const hit = cache.get(client.identity);
      if (hit && Date.now() - hit.at < ttlMs) return hit.spec;
      const response = await _fetchSpec(client, signal);
      const spec = toSpec(response.data as OpenApiDocument);
      cache.set(client.identity, { spec, at: Date.now() });
      return spec;
    },
  };
};
