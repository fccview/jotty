import { AsyncLocalStorage } from "node:async_hooks";
import type { ApiUser } from "./contract";

const scope = new AsyncLocalStorage<ApiUser>();

export const actAs = <T>(user: ApiUser, work: () => Promise<T>): Promise<T> =>
  scope.run(user, work);

export const apiCaller = (): ApiUser | undefined => scope.getStore();
