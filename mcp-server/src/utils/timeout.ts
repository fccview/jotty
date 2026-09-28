export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Jotty did not answer within ${ms} ms`);
    this.name = "TimeoutError";
  }
}

export const withDeadline = async <T>(
  ms: number,
  run: (signal: AbortSignal) => Promise<T>,
  outer?: AbortSignal,
): Promise<T> => {
  const timer = AbortSignal.timeout(ms);
  const signal = outer ? AbortSignal.any([timer, outer]) : timer;
  try {
    return await run(signal);
  } catch (err) {
    if (timer.aborted) throw new TimeoutError(ms);
    throw err;
  }
};
