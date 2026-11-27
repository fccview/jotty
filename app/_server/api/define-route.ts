import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/app/_server/actions/api/authenticate";
import { getCurrentUser } from "@/app/_server/actions/users";
import { API_KEY_HEADER } from "@/app/_utils/api-utils";
import { sanitizeUserForClient } from "@/app/_utils/user-sanitize-utils";
import { actAs } from "./caller-scope";
import {
  AnyContract,
  ApiHandler,
  ApiUser,
  MediaType,
  Parsed,
  RouteAuth,
  RouteContract,
  RouteInput,
  RouteParams,
  Schema,
} from "./contract";

const INVALID_JSON = "Request body must be valid JSON";
const INVALID_FORM = "Request body must be multipart/form-data";
const REPEATED_FIELD = "Each form field can only be sent once";
const BODY_TOO_LARGE = "Request body is too large";
const PAYLOAD_TOO_LARGE = 413;
const CONTENT_TYPE = "content-type";

class BadInput extends Error {
  constructor(
    message: string,
    readonly details?: z.core.$ZodIssue[],
    readonly status = 400,
  ) {
    super(message);
  }
}

const _tooLarge = () => new BadInput(BODY_TOO_LARGE, undefined, PAYLOAD_TOO_LARGE);

export const refuse = (error: string, status: number, extra?: object) =>
  NextResponse.json({ error, ...extra }, { status });

const _check = async <T extends Schema>(schema: T, value: unknown) => {
  if (!schema) return undefined;
  const result = await schema.safeParseAsync(value);
  if (result.success) return result.data;
  const [first] = result.error.issues;
  throw new BadInput(first?.message ?? "Invalid input", result.error.issues);
};

const _readCapped = async (request: NextRequest, limit: number) => {
  if (Number(request.headers.get("content-length")) > limit) throw _tooLarge();
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    size += chunk.value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw _tooLarge();
    }
    chunks.push(chunk.value);
  }
  return Buffer.concat(chunks).toString("utf8");
};

const _readBody = async (request: NextRequest, limit?: number) => {
  const text = limit ? await _readCapped(request, limit) : await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new BadInput(INVALID_JSON);
  }
};

const _capped = (request: NextRequest, limit: number) => {
  if (Number(request.headers.get("content-length")) > limit) throw _tooLarge();
  const gauge = { size: 0, burst: false };
  const meter = new TransformStream<Uint8Array, Uint8Array>({
    transform: (chunk, controller) => {
      gauge.size += chunk.byteLength;
      if (gauge.size <= limit) return controller.enqueue(chunk);
      gauge.burst = true;
      controller.error(_tooLarge());
    },
  });
  const form = new Response(request.body?.pipeThrough(meter), {
    headers: { [CONTENT_TYPE]: request.headers.get(CONTENT_TYPE) || "" },
  });
  return { form, gauge };
};

const _readForm = async (request: NextRequest, limit?: number) => {
  const { form, gauge } = limit ? _capped(request, limit) : { form: request, gauge: { burst: false } };
  const fields = await form.formData().catch(() => {
    throw gauge.burst ? _tooLarge() : new BadInput(INVALID_FORM);
  });
  const names = Array.from(fields.keys());
  if (new Set(names).size < names.length) throw new BadInput(REPEATED_FIELD);
  return Object.fromEntries(fields);
};

const _limitOf = async ({ bodyLimit }: AnyContract) =>
  typeof bodyLimit === "function" ? bodyLimit() : bodyLimit;

const _read = async (contract: AnyContract, request: NextRequest) => {
  const limit = await _limitOf(contract);
  return contract.bodyType === MediaType.FORM ? _readForm(request, limit) : _readBody(request, limit);
};

const _address = async <P extends Schema, Q extends Schema, B extends Schema>(
  contract: RouteContract<P, Q, B>,
  request: NextRequest,
  params?: RouteParams,
) => ({
  params: await _check(contract.params, (await params) ?? {}),
  query: await _check(
    contract.query,
    Object.fromEntries(request.nextUrl.searchParams),
  ),
});

const _payload = async <P extends Schema, Q extends Schema, B extends Schema>(
  contract: RouteContract<P, Q, B>,
  request: NextRequest,
) =>
  contract.body
    ? _check(contract.body, await _read(contract as AnyContract, request))
    : undefined;

const _parse = async <P extends Schema, Q extends Schema, B extends Schema>(
  contract: RouteContract<P, Q, B>,
  request: NextRequest,
  params?: RouteParams,
) => ({
  ...(await _address(contract, request, params)),
  body: await _payload(contract, request),
});

const _run = async (
  contract: AnyContract,
  work: () => Promise<Response>,
): Promise<Response> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof BadInput) {
      return refuse(error.message, error.status, error.details && { details: error.details });
    }
    console.error(`API ${contract.id} failed:`, error);
    return refuse("Internal server error", 500);
  }
};

type BareHandler = (
  request: NextRequest,
  context?: { params: RouteParams },
) => Promise<Response>;

const _caller = async (request: NextRequest, auth?: RouteAuth): Promise<ApiUser | null> => {
  const keyed = sanitizeUserForClient(
    await authenticateApiKey(request.headers.get(API_KEY_HEADER) || ""),
  );
  if (keyed || auth !== RouteAuth.SESSION_OR_KEY) return keyed;
  return getCurrentUser();
};

const _attach = (contract: AnyContract, handler: BareHandler): ApiHandler =>
  Object.assign(handler, { contract });

export const defineRoute = <
  P extends Schema = undefined,
  Q extends Schema = undefined,
  B extends Schema = undefined,
>(
  contract: RouteContract<P, Q, B>,
  handler: (input: RouteInput<P, Q, B, ApiUser>) => Promise<Response>,
): ApiHandler =>
  _attach(contract as AnyContract, (request, context) =>
    _run(contract as AnyContract, async () => {
      const user = await _caller(request, contract.auth);
      if (!user) return refuse("Unauthorized", 401);
      const address = await _address(contract, request, context?.params);
      return actAs(user, async () => {
        const turnedAway = await contract.bouncer?.({ user, params: address.params as Parsed<P> });
        if (turnedAway) return turnedAway;
        const body = await _payload(contract, request);
        return handler({ request, user, ...address, body } as RouteInput<P, Q, B, ApiUser>);
      });
    }),
  );

export const definePublicRoute = <
  P extends Schema = undefined,
  Q extends Schema = undefined,
  B extends Schema = undefined,
>(
  contract: RouteContract<P, Q, B>,
  handler: (input: RouteInput<P, Q, B, null>) => Promise<Response>,
): ApiHandler =>
  _attach({ ...contract, auth: RouteAuth.PUBLIC } as AnyContract, (request, context) =>
    _run(contract as AnyContract, async () => {
      const input = await _parse(contract, request, context?.params);
      return handler({ request, user: null, ...input } as RouteInput<P, Q, B, null>);
    }),
  );
