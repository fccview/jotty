/**
 * Minimal REST client for a remote jotty·page instance.
 *
 * Every authenticated Jotty endpoint is reached the same way: send a JSON
 * request with the `x-api-key` header and parse the JSON response. This class
 * centralises that so the tool modules only describe *what* to call.
 */

export interface JottyClientOptions {
  /** Base URL of the remote Jotty instance, e.g. https://jotty.example.com */
  baseUrl: string;
  /** API key (starts with `ck_`) generated from Jotty -> Profile -> Settings. */
  apiKey: string;
  /** Optional request timeout in milliseconds (default 30000). */
  timeoutMs?: number;
}

export class JottyApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "JottyApiError";
  }
}

type QueryValue = string | number | boolean | undefined | null;

function buildQuery(params: Record<string, QueryValue>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

export class JottyClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(options: JottyClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 30000;
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    query: Record<string, QueryValue> = {},
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}${buildQuery(query)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        "x-api-key": this.apiKey,
        Accept: "application/json",
      };
      const init: RequestInit = { method, headers, signal: controller.signal };
      if (body !== undefined && method !== "GET" && method !== "DELETE") {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(body);
      }

      const res = await fetch(url, init);
      const text = await res.text();
      const parsed = text ? safeParse(text) : undefined;

      if (!res.ok) {
        const message =
          (parsed && typeof parsed === "object" && "error" in parsed
            ? String((parsed as { error: unknown }).error)
            : `HTTP ${res.status}`) || `HTTP ${res.status}`;
        throw new JottyApiError(message, res.status, parsed);
      }
      return parsed as T;
    } catch (err) {
      if (err instanceof JottyApiError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new JottyApiError(
          `Request timed out after ${this.timeoutMs}ms`,
          408,
          undefined,
        );
      }
      throw new JottyApiError(
        err instanceof Error ? err.message : "Network request failed",
        0,
        undefined,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  get<T = unknown>(path: string, query: Record<string, QueryValue> = {}): Promise<T> {
    return this.request<T>("GET", path, query);
  }
  post<T = unknown>(path: string, body?: unknown, query: Record<string, QueryValue> = {}): Promise<T> {
    return this.request<T>("POST", path, query, body);
  }
  put<T = unknown>(path: string, body?: unknown, query: Record<string, QueryValue> = {}): Promise<T> {
    return this.request<T>("PUT", path, query, body);
  }
  patch<T = unknown>(path: string, body?: unknown, query: Record<string, QueryValue> = {}): Promise<T> {
    return this.request<T>("PATCH", path, query, body);
  }
  delete<T = unknown>(path: string, query: Record<string, QueryValue> = {}): Promise<T> {
    return this.request<T>("DELETE", path, query);
  }
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}