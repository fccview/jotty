const BATCH_WAIT_MS = 10;
const BATCH_TTL_MS = 30_000;
const PRUNE_AT = 500;

interface Cached<V> {
  at: number;
  value: Promise<V | undefined>;
}

export const batchLoader = <V>(
  load: (keys: string[]) => Promise<Record<string, V>>,
  ttlMs = BATCH_TTL_MS,
) => {
  const cache = new Map<string, Cached<V>>();
  let waiting = new Map<string, ((value: V | undefined) => void)[]>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = async () => {
    const batch = waiting;
    waiting = new Map();
    timer = null;
    let found: Record<string, V> = {};
    try {
      found = await load(Array.from(batch.keys()));
    } catch (error) {
      console.error("Batched lookup failed:", error);
      batch.forEach((_, key) => cache.delete(key));
    }
    batch.forEach((resolvers, key) => resolvers.forEach((resolve) => resolve(found[key])));
  };

  const prune = (now: number) =>
    cache.forEach((cached, key) => {
      if (now - cached.at >= ttlMs) cache.delete(key);
    });

  const get = (key: string): Promise<V | undefined> => {
    const now = Date.now();
    const hit = cache.get(key);
    if (hit && now - hit.at < ttlMs) return hit.value;
    if (cache.size >= PRUNE_AT) prune(now);

    const value = new Promise<V | undefined>((resolve) => {
      waiting.set(key, [...(waiting.get(key) || []), resolve]);
    });
    cache.set(key, { at: now, value });
    if (!timer) timer = setTimeout(flush, BATCH_WAIT_MS);
    return value;
  };

  const forget = () => cache.clear();

  return { get, forget };
};
