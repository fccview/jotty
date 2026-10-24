interface Pinnable {
  uuid?: string;
}

const matchesPin = (item: Pinnable, pin: string) =>
  !!item.uuid && (pin === item.uuid || pin.split("/").pop() === item.uuid);

export const pinsFirst = <T extends Pinnable>(
  items: T[],
  pinnedPaths: string[],
  limit: number,
): T[] => {
  const found = pinnedPaths.map((pin) => items.find((item) => matchesPin(item, pin)));
  const pinned = found.filter(
    (item, index): item is T => !!item && found.indexOf(item) === index,
  );
  const rest = items.filter((item) => !pinned.includes(item));
  return [...pinned, ...rest.slice(0, limit)];
};
