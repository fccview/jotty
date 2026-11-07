import { useEffect, useRef, useState } from "react";

interface ServerItem {
  id: string;
  updatedAt?: string;
  category?: string;
}

export const useServerItem = <T extends ServerItem>(item: T) => {
  const [local, setLocal] = useState<T>(item);
  const seen = useRef(item);

  useEffect(() => {
    const previous = seen.current;
    seen.current = item;

    if (item.id !== previous.id || item.updatedAt !== previous.updatedAt) {
      setLocal(item);
      return;
    }

    if (item.category !== previous.category) {
      setLocal((current) => ({ ...current, category: item.category }));
    }
  }, [item]);

  return [local, setLocal] as const;
};
