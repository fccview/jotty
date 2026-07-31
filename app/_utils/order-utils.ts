export const orderByUuids = <T>(
  items: T[],
  uuids: string[] | undefined,
  keyOf: (item: T) => string | undefined,
): T[] => {
  if (!uuids || uuids.length === 0) return items;

  const rank = new Map<string, number>();
  uuids.forEach((uuid, index) => rank.set(uuid, index));

  const ranked: T[] = [];
  const rest: T[] = [];

  items.forEach((item) => {
    const key = keyOf(item);
    if (key && rank.has(key)) {
      ranked.push(item);
    } else {
      rest.push(item);
    }
  });

  ranked.sort((a, b) => rank.get(keyOf(a)!)! - rank.get(keyOf(b)!)!);

  return [...ranked, ...rest];
};
