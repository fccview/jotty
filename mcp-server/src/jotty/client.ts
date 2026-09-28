import type { JottyConfig } from "../config/schema.ts";
import { logger } from "../utils/logger.ts";
import { withDeadline } from "../utils/timeout.ts";

const LOG_NS = "jotty";
const API_PREFIX = "/api";
const API_KEY_HEADER = "x-api-key";
const JSON_TYPE = "application/json";

export class JottyError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "JottyError";
  }
}

export interface JottyRequest {
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

export interface JottyResponse {
  status: number;
  contentType: string;
  data: unknown;
}

export interface JottyClient {
  baseUrl: string;
  hasApiKey: boolean;
  identity: string;
  send: (request: JottyRequest) => Promise<JottyResponse>;
}

const _url = (baseUrl: string, path: string, query?: Record<string, string>): string => {
  const url = new URL(`${baseUrl}${API_PREFIX}${path}`);
  Object.entries(query ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
};

const _decode = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const _messageOf = (data: unknown, status: number): string =>
  data && typeof data === "object" && "error" in data && typeof data.error === "string"
    ? data.error
    : `Jotty answered ${status}`;

const _fingerprint = (apiKey: string): string =>
  new Bun.CryptoHasher("sha256").update(apiKey).digest("hex").slice(0, 16);

export const createClient = (config: JottyConfig, apiKey = config.apiKey): JottyClient => ({
  baseUrl: config.url,
  hasApiKey: Boolean(apiKey),
  identity: `${config.url}#${_fingerprint(apiKey)}`,
  send: ({ method, path, query, body, signal }) =>
    withDeadline(
      config.timeoutMs,
      async (combined) => {
        const started = Date.now();
        const response = await fetch(_url(config.url, path, query), {
          method: method.toUpperCase(),
          headers: {
            ...(apiKey ? { [API_KEY_HEADER]: apiKey } : {}),
            ...(body === undefined ? {} : { "content-type": JSON_TYPE }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: combined,
        });
        const data = await _decode(response);
        logger.debug(LOG_NS, `${method.toUpperCase()} ${path} ${response.status} ${Date.now() - started}ms`);
        if (!response.ok) throw new JottyError(_messageOf(data, response.status), response.status, data);
        return {
          status: response.status,
          contentType: response.headers.get("content-type") ?? "",
          data,
        };
      },
      signal,
    ),
});
