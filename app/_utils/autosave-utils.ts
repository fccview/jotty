export const AUTOSAVE_DEFAULT_MS = 5000;
export const AUTOSAVE_MAX_WAIT_FACTOR = 3;

export const autosaveDelay = (interval: number, dirtySince: number | null, now: number) => {
  if (dirtySince === null) return interval;
  const deadline = dirtySince + interval * AUTOSAVE_MAX_WAIT_FACTOR;
  return Math.max(0, Math.min(interval, deadline - now));
};
