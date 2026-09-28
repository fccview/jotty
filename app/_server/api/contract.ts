import type { NextRequest } from "next/server";
import type { z } from "zod";
import type { SanitisedUser } from "@/app/_types";

export enum HttpMethod {
  GET = "get",
  POST = "post",
  PUT = "put",
  PATCH = "patch",
  DELETE = "delete",
}

export enum ApiTag {
  SYSTEM = "System",
  NOTES = "Notes",
  CHECKLISTS = "Checklists",
  CHECKLIST_ITEMS = "Checklist items",
  TASKS = "Tasks",
  KANBAN = "Kanban",
  DISCOVERY = "Discovery",
  RELATIONS = "Relations",
  SHARING = "Sharing",
  USERS = "Users",
  EXPORTS = "Exports",
  LOGS = "Logs",
  ADMIN = "Admin",
}

export enum RouteAuth {
  API_KEY = "apiKey",
  SESSION_OR_KEY = "sessionOrKey",
  PUBLIC = "public",
}

export enum MediaType {
  JSON = "application/json",
  YAML = "application/yaml",
  ZIP = "application/zip",
  CSV = "text/csv",
  CALENDAR = "text/calendar",
  BINARY = "application/octet-stream",
}

export interface ResponseBody {
  mediaType: MediaType;
  schema?: z.ZodType;
}

export interface ResponseSpec {
  description: string;
  schema?: z.ZodType;
  mediaType?: MediaType;
  alternatives?: ResponseBody[];
}

export type Schema = z.ZodType | undefined;

export interface RouteContract<
  P extends Schema = undefined,
  Q extends Schema = undefined,
  B extends Schema = undefined,
> {
  id: string;
  method: HttpMethod;
  path: string;
  tag: ApiTag;
  summary: string;
  description?: string;
  auth?: RouteAuth;
  deprecated?: boolean;
  params?: P;
  query?: Q;
  body?: B;
  responses: Record<number, ResponseSpec>;
}

export type AnyContract = RouteContract<Schema, Schema, Schema>;

export type Parsed<T extends Schema> = T extends z.ZodType
  ? z.output<T>
  : undefined;

export interface RouteInput<
  P extends Schema,
  Q extends Schema,
  B extends Schema,
  U,
> {
  request: NextRequest;
  user: U;
  params: Parsed<P>;
  query: Parsed<Q>;
  body: Parsed<B>;
}

export type RouteParams = Promise<Record<string, string | string[]>>;

export type ApiHandler = ((
  request: NextRequest,
  context?: { params: RouteParams },
) => Promise<Response>) & { contract: AnyContract };

export type ApiUser = SanitisedUser;
