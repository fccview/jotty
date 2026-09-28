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
  RouteAuth,
  RouteContract,
  RouteInput,
  RouteParams,
  Schema,
} from "./contract";

const INVALID_JSON = "Request body must be valid JSON";

class BadInput extends Error {
  constructor(
    message: string,
    readonly details?: z.core.$ZodIssue[],
  ) {
    super(message);
  }
}

export const refuse = (error: string, status: number, extra?: object) =>
  NextResponse.json({ error, ...extra }, { status });

const _check = async <T extends Schema>(schema: T, value: unknown) => {
  if (!schema) return undefined;
  const result = await schema.safeParseAsync(value);
  if (result.success) return result.data;
  const [first] = result.error.issues;
  throw new BadInput(first?.message ?? "Invalid input", result.error.issues);
};

const _readBody = async (request: NextRequest) => {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new BadInput(INVALID_JSON);
  }
};

const _parse = async <P extends Schema, Q extends Schema, B extends Schema>(
  contract: RouteContract<P, Q, B>,
  request: NextRequest,
  params?: RouteParams,
) => ({
  params: await _check(contract.params, (await params) ?? {}),
  query: await _check(
    contract.query,
    Object.fromEntries(request.nextUrl.searchParams),
  ),
  body: contract.body
    ? await _check(contract.body, await _readBody(request))
    : undefined,
});

const _run = async (
  contract: AnyContract,
  work: () => Promise<Response>,
): Promise<Response> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof BadInput) {
      return refuse(error.message, 400, error.details && { details: error.details });
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
      const input = await _parse(contract, request, context?.params);
      return actAs(user, () =>
        handler({ request, user, ...input } as RouteInput<P, Q, B, ApiUser>),
      );
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
