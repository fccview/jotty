"use client";

import { useCallback } from "react";
import { useFormatter } from "next-intl";

export const useCompactNumber = () => {
  const format = useFormatter();
  return useCallback(
    (value: number) =>
      format.number(value, { notation: "compact", maximumFractionDigits: 1 }),
    [format],
  );
};
