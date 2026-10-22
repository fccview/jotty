export const RETRY_BASE_MS = 2000;
export const RETRY_MAX_MS = 60000;

export interface BodyFailure {
  attempts: number;
  retryAt: number;
}

export type BodyFailures = Map<string, BodyFailure>;

export const retryDelay = (attempts: number): number =>
  Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1));

export const withFailures = (
  failures: BodyFailures,
  keys: string[],
  now: number,
): BodyFailures => {
  const next = new Map(failures);
  keys.forEach((key) => {
    const attempts = (failures.get(key)?.attempts ?? 0) + 1;
    next.set(key, { attempts, retryAt: now + retryDelay(attempts) });
  });
  return next;
};

export const withoutFailures = (failures: BodyFailures, keys: string[]): BodyFailures => {
  const next = new Map(failures);
  keys.forEach((key) => next.delete(key));
  return next;
};

export const isCoolingDown = (failures: BodyFailures, key: string, now: number): boolean =>
  (failures.get(key)?.retryAt ?? 0) > now;

export const nextRetryIn = (failures: BodyFailures, now: number): number | null => {
  const waits = Array.from(failures.values(), ({ retryAt }) => retryAt - now).filter(
    (wait) => wait > 0,
  );
  return waits.length ? Math.min(...waits) : null;
};

export const retryNow = (failures: BodyFailures): BodyFailures => {
  if (!failures.size) return failures;
  return new Map(
    Array.from(failures, ([key, failure]) => [key, { ...failure, retryAt: 0 }]),
  );
};
