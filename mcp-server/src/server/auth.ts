import { timingSafeEqual } from "node:crypto";

export const API_KEY_HEADER = "x-api-key";

export interface Guard {
  required: boolean;
  allows: (request: Request) => boolean;
}

const _same = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

export const bearerOf = (request: Request): string => {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
};

export const createGuard = (token: string): Guard => ({
  required: Boolean(token),
  allows: (request) => (token ? _same(bearerOf(request), token) : true),
});

export const deniedResponse = (): Response =>
  Response.json({ error: "You shall not pass!" }, { status: 401 });
