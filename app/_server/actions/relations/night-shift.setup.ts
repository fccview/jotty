import { AsyncLocalStorage } from "node:async_hooks";

const scope = globalThis as { AsyncLocalStorage?: typeof AsyncLocalStorage };
scope.AsyncLocalStorage ??= AsyncLocalStorage;
