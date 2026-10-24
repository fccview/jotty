import { lock, unlock } from "proper-lockfile";
import { runQueued } from "./concurrency";

const LOCK_STALE_MS = 30000;
const LOCK_RETRIES = { retries: 20, factor: 1.5, minTimeout: 50, maxTimeout: 1000 };

const _lane = (filePath: string): string => `file-lock:${filePath}`;

const _shrugOff = (filePath: string) => (error: Error) =>
  console.error(`Lost the lock on ${filePath} while holding it:`, error);

export const withFileLock = <T>(
  filePath: string,
  errand: () => Promise<T>,
): Promise<T> =>
  runQueued(_lane(filePath), async () => {
    await lock(filePath, {
      stale: LOCK_STALE_MS,
      retries: LOCK_RETRIES,
      onCompromised: _shrugOff(filePath),
    });

    try {
      return await errand();
    } finally {
      try {
        await unlock(filePath);
      } catch (error) {
        console.error(`Failed to release the lock on ${filePath}:`, error);
      }
    }
  });
